import base64
import hashlib
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, or_, and_
from geoalchemy2.shape import to_shape
from app.models.business import Business
from app.models.location import Location
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.operating_hours import OperatingHours
from app.repositories.category_repository import CategoryRepository
from fastapi import HTTPException
from typing import Optional

class DiscoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.category_repo = CategoryRepository(db)

    async def list_categories(self) -> list[dict]:
        categories = await self.category_repo.list_all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "image_url": f"/api/v1/categories/{c.id}/image" if c.image_data else None,
            }
            for c in categories
        ]

    def _fingerprint(self, search, category_id, lat, lon, radius):
        raw = f"{search or ''}|{category_id or ''}|{lat or ''}|{lon or ''}|{radius or ''}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _decode_cursor(self, cursor: Optional[str], current_fp: str):
        if not cursor:
            return None
        try:
            data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid cursor")
        if data.get("f") != current_fp:
            raise HTTPException(status_code=400, detail="Invalid cursor – filters changed")
        return data

    async def _no_location_rows(self, category_id, search, cursor_data, limit, current_fp):
        filters = [
            Business.deleted_at == None,
            Business.is_active == True,
        ]
        if category_id is not None:
            filters.append(Business.category_id == category_id)
        if search:
            escaped = search.replace("%", r"\%").replace("_", r"\_")
            pattern = f"%{escaped}%"
            filters.append(
                or_(
                    Business.name.ilike(pattern, escape='\\'),
                    Business.description.ilike(pattern, escape='\\'),
                )
            )

        query = select(Business).where(*filters)
        if cursor_data and cursor_data.get("last_trust_score") is not None:
            lts = cursor_data["last_trust_score"]
            lid = cursor_data["last_id"]
            query = query.where(
                or_(
                    Business.trust_score < lts,
                    and_(Business.trust_score == lts, Business.id > lid)
                )
            )
        query = query.order_by(Business.trust_score.desc(), Business.id.asc()).limit(limit + 1)
        result = await self.db.execute(query)
        rows = [(r, None) for r in result.scalars().all()]

        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
            last_biz = rows[-1][0]
            next_cursor = base64.urlsafe_b64encode(json.dumps({
                "last_trust_score": float(last_biz.trust_score),
                "last_distance": None,
                "last_id": str(last_biz.id),
                "f": current_fp,
            }).encode()).decode()
        else:
            next_cursor = None
        return rows, next_cursor

    async def _location_rows(self, lat, lon, radius, category_id, search):
        point_wkt = f'SRID=4326;POINT({lon} {lat})'

        filters = [
            Business.deleted_at == None,
            Business.is_active == True,
        ]
        if category_id is not None:
            filters.append(Business.category_id == category_id)
        if search:
            escaped = search.replace("%", r"\%").replace("_", r"\_")
            pattern = f"%{escaped}%"
            filters.append(
                or_(
                    Business.name.ilike(pattern, escape='\\'),
                    Business.description.ilike(pattern, escape='\\'),
                )
            )

        distance_expr = func.ST_Distance(Location.coordinates, func.ST_GeogFromText(point_wkt))
        group_expr = case(
            (Location.coordinates.is_(None), 2),
            (distance_expr <= radius, 0),
            else_=1
        )

        query = (
            select(Business, distance_expr.label('distance_meters'))
            .join(
                Location,
                and_(
                    Location.business_id == Business.id,
                    Location.is_primary == True,
                ),
                isouter=True,
            )
            .where(*filters)
            .order_by(
                group_expr.asc(),
                distance_expr.asc().nulls_last(),
                Business.id.asc(),
            )
        )
        result = await self.db.execute(query)
        return [(r, float(d) if d is not None else None) for r, d in result.all()]

    def _paginate_location_rows(self, rows, radius, limit, cursor_data, current_fp):
        phase = cursor_data.get("phase") if cursor_data else "nearby"
        last_dist = cursor_data.get("last_distance") if cursor_data else None
        last_id = cursor_data.get("last_id") if cursor_data else None

        group0 = [row for row in rows if row[1] is not None and row[1] <= radius]
        group1 = [row for row in rows if row[1] is not None and row[1] > radius]
        group2 = [row for row in rows if row[1] is None]

        next_cursor = None

        if phase == "nearby":
            start = 0
            if last_dist is not None and last_id is not None:
                for i, (b, d) in enumerate(group0):
                    if (d > last_dist) or (d == last_dist and str(b.id) > last_id):
                        start = i
                        break
                else:
                    start = len(group0)
            candidate = group0[start:start + limit + 1]
            if len(candidate) > limit:
                rows = candidate[:limit]
                last_biz, last_d = rows[-1]
                next_cursor = self._make_cursor("nearby", last_d, last_biz.id, radius, current_fp)
            else:
                rows = candidate
                remaining = group1[:limit - len(rows) + 1]
                if remaining:
                    rows += remaining[:limit - len(rows)]
                    last_biz, last_d = rows[-1]
                    next_cursor = self._make_cursor("farther", last_d if last_d is not None else 0, last_biz.id, radius, current_fp)
                else:
                    next_cursor = None

        elif phase == "farther":
            start = 0
            if last_dist is not None and last_id is not None:
                for i, (b, d) in enumerate(group1):
                    if (d > last_dist) or (d == last_dist and str(b.id) > last_id):
                        start = i
                        break
                else:
                    start = len(group1)
            candidate = group1[start:start + limit + 1]
            if len(candidate) > limit:
                rows = candidate[:limit]
                last_biz, last_d = rows[-1]
                next_cursor = self._make_cursor("farther", last_d, last_biz.id, radius, current_fp)
            else:
                rows = candidate
                remaining = group2[:limit - len(rows) + 1]
                if remaining:
                    rows += remaining[:limit - len(rows)]
                next_cursor = None

        else:
            rows = group2[:limit]
            next_cursor = None

        return rows, next_cursor

    def _make_cursor(self, phase, last_distance, last_id, radius, fingerprint):
        return base64.urlsafe_b64encode(json.dumps({
            "phase": phase,
            "last_trust_score": None,
            "last_distance": last_distance,
            "last_id": str(last_id),
            "radius": radius,
            "f": fingerprint,
        }).encode()).decode()

    async def discover_businesses(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius: float = 5000.0,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 20,
    ) -> dict:
        current_fp = self._fingerprint(search, category_id, lat, lon, radius)
        cursor_data = self._decode_cursor(cursor, current_fp)

        if lat is None or lon is None:
            rows, next_cursor = await self._no_location_rows(category_id, search, cursor_data, limit, current_fp)
        else:
            if radius > 50000:
                raise HTTPException(status_code=400, detail="Maximum radius is 50km")
            rows = await self._location_rows(lat, lon, radius, category_id, search)
            rows, next_cursor = self._paginate_location_rows(rows, radius, limit, cursor_data, current_fp)

        business_rows = [b for b, _ in rows]
        cat_ids = {b.category_id for b in business_rows}
        cat_map = {}
        if cat_ids:
            cat_result = await self.db.execute(select(Category).where(Category.id.in_(cat_ids)))
            for cat in cat_result.scalars().all():
                cat_map[cat.id] = cat.name

        loc_map = {}
        if business_rows:
            loc_bulk = await self.db.execute(
                select(Location).where(
                    Location.business_id.in_([b.id for b in business_rows]),
                    Location.is_primary == True,
                )
            )
            for l in loc_bulk.scalars().all():
                loc_map[l.business_id] = l

        hours_map = {}
        if business_rows:
            hours_bulk = await self.db.execute(
                select(OperatingHours)
                .where(OperatingHours.business_id.in_([b.id for b in business_rows]))
                .order_by(OperatingHours.business_id, OperatingHours.day_of_week)
            )
            for h in hours_bulk.scalars().all():
                hours_map.setdefault(h.business_id, []).append(h)

        # Batch-load snippet configurations and selected products for page businesses
        biz_ids = [b.id for b in business_rows]
        snippet_map = {}
        snippet_product_map = {}
        if biz_ids:
            from app.models.business_home_snippet import BusinessHomeSnippet
            from app.models.business_home_snippet_product import BusinessHomeSnippetProduct
            snippet_result = await self.db.execute(
                select(BusinessHomeSnippet).where(BusinessHomeSnippet.business_id.in_(biz_ids))
            )
            snippets = snippet_result.scalars().all()
            for s in snippets:
                snippet_map[s.business_id] = s

            if snippets:
                snippet_ids = [s.id for s in snippets]
                prod_assoc_result = await self.db.execute(
                    select(BusinessHomeSnippetProduct)
                    .where(BusinessHomeSnippetProduct.snippet_id.in_(snippet_ids))
                    .order_by(BusinessHomeSnippetProduct.position)
                )
                for assoc in prod_assoc_result.scalars().all():
                    snippet_product_map.setdefault(assoc.snippet_id, []).append(assoc)

        # Determine display product ids per business
        snippet_biz_ids = set(snippet_map.keys())
        no_snippet_biz_ids = [b.id for b in business_rows if b.id not in snippet_biz_ids]

        default_map = {}
        if no_snippet_biz_ids:
            from sqlalchemy import text
            id_list = ', '.join([f"'{str(bid)}'" for bid in no_snippet_biz_ids])
            ranked_sql = text(f"""
                WITH ranked AS (
                    SELECT p.id, p.business_id,
                           ROW_NUMBER() OVER (
                               PARTITION BY p.business_id
                               ORDER BY p.created_at ASC, p.id ASC
                           ) AS rn
                    FROM products p
                    WHERE p.deleted_at IS NULL
                      AND p.is_available = true
                      AND (
                          p.track_inventory = false
                          OR p.stock_quantity > 0
                      )
                      AND p.business_id IN ({id_list})
                )
                SELECT id, business_id FROM ranked WHERE rn <= 4
            """)
            result = await self.db.execute(ranked_sql)
            for row in result.fetchall():
                default_map.setdefault(row.business_id, []).append(row.id)

        display_product_ids = []
        for b in business_rows:
            snippet = snippet_map.get(b.id)
            if snippet:
                assoc_list = snippet_product_map.get(snippet.id, [])
                ids = [a.product_id for a in assoc_list]
            else:
                ids = default_map.get(b.id, [])
            display_product_ids.extend(ids)

        # Batch load product info + primary image for all display ids
        product_info_map = {}
        if display_product_ids:
            prod_result = await self.db.execute(
                select(Product).where(Product.id.in_(display_product_ids))
            )
            prod_map = {p.id: p for p in prod_result.scalars().all()}

            from app.models.product_image import ProductImage
            img_result = await self.db.execute(
                select(ProductImage).where(
                    ProductImage.product_id.in_(display_product_ids),
                    ProductImage.position == 1,
                )
            )
            img_map = {}
            for img in img_result.scalars().all():
                img_map[img.product_id] = img.id

            for pid in display_product_ids:
                p = prod_map.get(pid)
                if p:
                    product_info_map[pid] = {
                        "id": p.id,
                        "name": p.name,
                        "image_url": f"/api/v1/product/{img_map.get(pid)}" if pid in img_map else None,
                    }

        businesses = []
        for business, distance in rows:
            location = loc_map.get(business.id)
            lat_lon = {"lat": 0.0, "lon": 0.0}
            address_text = None
            if location:
                point = to_shape(location.coordinates)
                lat_lon = {"lat": point.y, "lon": point.x}
                address_text = location.address_text

            hours = hours_map.get(business.id, [])
            hours_list = [{
                "day_of_week": h.day_of_week,
                "opens_at": str(h.opens_at) if h.opens_at else None,
                "closes_at": str(h.closes_at) if h.closes_at else None,
                "is_closed": h.is_closed
            } for h in hours]

            # snippet data
            snippet_title = None
            snippet_products = []
            snippet = snippet_map.get(business.id)
            if snippet:
                assoc_list = snippet_product_map.get(snippet.id, [])
                selected_ids = [a.product_id for a in assoc_list]
                displayable = [pid for pid in selected_ids if pid in product_info_map]
                if displayable:
                    snippet_title = snippet.title or "Take a look at what we offer"
                    snippet_products = [product_info_map[pid] for pid in displayable]
            else:
                displayable_default = [pid for pid in default_map.get(business.id, []) if pid in product_info_map]
                if displayable_default:
                    snippet_title = "Take a look at what we offer"
                    snippet_products = [product_info_map[pid] for pid in displayable_default]

            businesses.append({
                "id": str(business.id),
                "name": business.name,
                "category_id": business.category_id,
                "category_name": cat_map.get(business.category_id, "Unknown"),
                "description": business.description,
                "trust_score": float(business.trust_score),
                "logo_url": f"/api/v1/businesses/{business.id}/logo" if (business.logo_data or business.logo_url) else None,
                "slug": business.slug,
                "distance_meters": round(distance, 2) if distance is not None else None,
                "location": lat_lon,
                "address_text": address_text,
                "cover_url": f"/api/v1/businesses/{business.id}/cover" if business.cover_data else None,
                "operating_hours": hours_list,
                "snippet_title": snippet_title,
                "snippet_products": snippet_products,
            })

        return {"businesses": businesses, "next_cursor": next_cursor}
