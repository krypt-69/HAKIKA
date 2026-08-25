import base64
import hashlib
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import to_shape
from app.models.business import Business
from app.models.location import Location
from app.models.category import Category
from app.models.operating_hours import OperatingHours
from app.repositories.category_repository import CategoryRepository
from fastapi import HTTPException
from typing import List, Optional
import uuid

class DiscoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.category_repo = CategoryRepository(db)

    async def list_categories(self) -> list[Category]:
        return await self.category_repo.list_all()

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
        # No location → global ordering (trust_score DESC, business_id ASC)
        if lat is None or lon is None:
            query = (
                select(Business)
                .where(Business.deleted_at == None, Business.is_active == True)
                .order_by(Business.trust_score.desc(), Business.id.asc())
            )
            if category_id is not None:
                query = query.where(Business.category_id == category_id)
            if search:
                escaped = search.replace("%", r"\%").replace("_", r"\_")
                pattern = f"%{escaped}%"
                query = query.where(
                    Business.name.ilike(pattern, escape='\\') |
                    Business.description.ilike(pattern, escape='\\')
                )

            result = await self.db.execute(query)
            rows = [(r, None) for r in result.scalars().all()]
        else:
            if radius > 50000:
                raise HTTPException(status_code=400, detail="Maximum radius is 50km")

            # Base query: all active, non-deleted businesses, with optional category filter
            base_query = select(Business).where(
                Business.deleted_at == None, Business.is_active == True
            )
            if category_id is not None:
                base_query = base_query.where(Business.category_id == category_id)
            if search:
                escaped = search.replace("%", r"\%").replace("_", r"\_")
                pattern = f"%{escaped}%"
                base_query = base_query.where(
                    Business.name.ilike(pattern, escape='\\') |
                    Business.description.ilike(pattern, escape='\\')
                )

            result = await self.db.execute(base_query)
            all_businesses = result.scalars().all()

            # Compute distance for every business that has a location
            point_wkt = f'SRID=4326;POINT({lon} {lat})'
            distance_map = {}  # business_id -> distance_meters (float or None)
            for b in all_businesses:
                loc_q = select(Location).where(
                    Location.business_id == b.id,
                    Location.is_primary == True
                )
                loc_r = await self.db.execute(loc_q)
                loc = loc_r.scalar_one_or_none()
                if loc:
                    dist_q = select(func.ST_Distance(loc.coordinates, func.ST_GeogFromText(point_wkt)))
                    dist_r = await self.db.execute(dist_q)
                    dist = dist_r.scalar_one()
                    distance_map[b.id] = float(dist)
                else:
                    distance_map[b.id] = None

            # Group: nearby (≤ radius), farther (> radius), no‑location (None)
            nearby = []
            farther = []
            no_location = []
            for b in all_businesses:
                d = distance_map[b.id]
                if d is None:
                    no_location.append((b, d))
                elif d <= radius:
                    nearby.append((b, d))
                else:
                    farther.append((b, d))

            # Sort each group: (distance, business_id)
            nearby.sort(key=lambda x: (x[1], x[0].id))
            farther.sort(key=lambda x: (x[1], x[0].id))
            no_location.sort(key=lambda x: x[0].id)

            # Combine: nearby first, then farther, then no‑location
            rows = nearby + farther + no_location

        # Preload category names
        business_rows = [b for b, _ in rows]
        cat_ids = {b.category_id for b in business_rows}
        cat_map = {}
        if cat_ids:
            cat_result = await self.db.execute(
                select(Category).where(Category.id.in_(cat_ids))
            )
        # --- Cursor decoding & fingerprint validation ---
        def fingerprint(search, category_id, lat, lon, radius):
            raw = f"{search or ''}|{category_id or ''}|{lat or ''}|{lon or ''}|{radius or ''}"
            return hashlib.sha256(raw.encode()).hexdigest()

        current_fp = fingerprint(search, category_id, lat, lon, radius)

        cursor_data = None
        if cursor:
            try:
                cursor_data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid cursor")
            if cursor_data.get("f") != current_fp:
                raise HTTPException(status_code=400, detail="Invalid cursor – filters changed")

        # --- No location branch ---
        if lat is None or lon is None:
            query = (
                select(Business)
                .where(Business.deleted_at == None, Business.is_active == True)
            )
            if category_id is not None:
                query = query.where(Business.category_id == category_id)
            if search:
                escaped = search.replace("%", r"\%").replace("_", r"\_")
                pattern = f"%{escaped}%"
                query = query.where(
                    Business.name.ilike(pattern, escape='\\') |
                    Business.description.ilike(pattern, escape='\\')
                )

            # Apply cursor continuation condition
            if cursor_data and cursor_data["last_trust_score"] is not None:
                lts = cursor_data["last_trust_score"]
                lid = cursor_data["last_id"]
                from sqlalchemy import or_, and_
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
                    "phase": None,
                    "last_trust_score": float(last_biz.trust_score),
                    "last_distance": None,
                    "last_id": str(last_biz.id),
                    "radius": None,
                    "f": current_fp
                }).encode()).decode()
            else:
                next_cursor = None

        # --- Location branch ---
        else:
            if radius > 50000:
                raise HTTPException(status_code=400, detail="Maximum radius is 50km")

            point_wkt = f'SRID=4326;POINT({lon} {lat})'

            # Build all matching businesses
            base_query = select(Business).where(
                Business.deleted_at == None, Business.is_active == True
            )
            if category_id is not None:
                base_query = base_query.where(Business.category_id == category_id)
            if search:
                escaped = search.replace("%", r"\%").replace("_", r"\_")
                pattern = f"%{escaped}%"
                base_query = base_query.where(
                    Business.name.ilike(pattern, escape='\\') |
                    Business.description.ilike(pattern, escape='\\')
                )

            result = await self.db.execute(base_query)
            all_businesses = result.scalars().all()

            # Compute distances
            distance_map = {}
            for b in all_businesses:
                loc_q = select(Location).where(
                    Location.business_id == b.id,
                    Location.is_primary == True
                )
                loc_r = await self.db.execute(loc_q)
                loc = loc_r.scalar_one_or_none()
                if loc:
                    dist_q = select(func.ST_Distance(loc.coordinates, func.ST_GeogFromText(point_wkt)))
                    dist_r = await self.db.execute(dist_q)
                    distance_map[b.id] = float(dist_r.scalar_one())
                else:
                    distance_map[b.id] = None

            # Build sorted groups
            nearby, farther, no_loc = [], [], []
            for b in all_businesses:
                d = distance_map[b.id]
                if d is None:
                    no_loc.append((b, d))
                elif d <= radius:
                    nearby.append((b, d))
                else:
                    farther.append((b, d))

            nearby.sort(key=lambda x: (x[1], x[0].id))
            farther.sort(key=lambda x: (x[1], x[0].id))
            no_loc.sort(key=lambda x: x[0].id)
            combined = nearby + farther + no_loc

            # Apply cursor pagination
            phase = cursor_data["phase"] if cursor_data else "nearby"
            last_dist = cursor_data["last_distance"] if cursor_data else None
            last_id = cursor_data["last_id"] if cursor_data else None

            if phase == "nearby":
                # Slice nearby list based on cursor
                start_idx = 0
                if last_dist is not None and last_id is not None:
                    for i, (b, d) in enumerate(nearby):
                        if (d > last_dist) or (d == last_dist and str(b.id) > last_id):
                            start_idx = i
                            break
                    else:
                        start_idx = len(nearby)
                remaining_nearby = nearby[start_idx:start_idx + limit + 1]
                if len(remaining_nearby) > limit:
                    rows = remaining_nearby[:limit]
                    last_biz, last_d = rows[-1]
                    next_cursor = base64.urlsafe_b64encode(json.dumps({
                        "phase": "nearby",
                        "last_trust_score": None,
                        "last_distance": last_d,
                        "last_id": str(last_biz.id),
                        "radius": radius,
                        "f": current_fp
                    }).encode()).decode()
                else:
                    rows = remaining_nearby
                    # Transition to farther
                    remaining_farther = farther[:limit - len(rows) + 1]
                    if len(remaining_farther) > limit - len(rows):
                        rows += remaining_farther[:limit - len(rows)]
                        last_biz, last_d = rows[-1]
                        next_cursor = base64.urlsafe_b64encode(json.dumps({
                            "phase": "farther",
                            "last_trust_score": None,
                            "last_distance": last_d,
                            "last_id": str(last_biz.id),
                            "radius": radius,
                            "f": current_fp
                        }).encode()).decode()
                    else:
                        rows += remaining_farther
                        # Check no_loc too
                        remaining_no_loc = no_loc[:limit - len(rows) + 1]
                        if remaining_no_loc:
                            rows += remaining_no_loc[:limit - len(rows)]
                            if len(rows) == limit + 1:
                                rows = rows[:limit]
                                last_biz, last_d = rows[-1]
                                next_cursor = base64.urlsafe_b64encode(json.dumps({
                                    "phase": "farther",
                                    "last_trust_score": None,
                                    "last_distance": last_d if last_d is not None else 0,
                                    "last_id": str(last_biz.id),
                                    "radius": radius,
                                    "f": current_fp
                                }).encode()).decode()
                            else:
                                next_cursor = None
                        else:
                            next_cursor = None
            elif phase == "farther":
                # Start from farther list based on cursor
                start_idx = 0
                if last_dist is not None and last_id is not None:
                    for i, (b, d) in enumerate(farther):
                        if (d > last_dist) or (d == last_dist and str(b.id) > last_id):
                            start_idx = i
                            break
                    else:
                        start_idx = len(farther)
                remaining_farther = farther[start_idx:start_idx + limit + 1]
                if len(remaining_farther) > limit:
                    rows = remaining_farther[:limit]
                    last_biz, last_d = rows[-1]
                    next_cursor = base64.urlsafe_b64encode(json.dumps({
                        "phase": "farther",
                        "last_trust_score": None,
                        "last_distance": last_d,
                        "last_id": str(last_biz.id),
                        "radius": radius,
                        "f": current_fp
                    }).encode()).decode()
                else:
                    rows = remaining_farther
                    remaining_no_loc = no_loc[:limit - len(rows) + 1]
                    if remaining_no_loc:
                        rows += remaining_no_loc[:limit - len(rows)]
                        if len(rows) == limit + 1:
                            rows = rows[:limit]
                            last_biz, last_d = rows[-1]
                            next_cursor = base64.urlsafe_b64encode(json.dumps({
                                "phase": "farther",
                                "last_trust_score": None,
                                "last_distance": last_d if last_d is not None else 0,
                                "last_id": str(last_biz.id),
                                "radius": radius,
                                "f": current_fp
                            }).encode()).decode()
                        else:
                            next_cursor = None
                    else:
                        next_cursor = None
            else:
                rows = []
                next_cursor = None

            # Ensure we don't exceed limit+1
            if len(rows) > limit:
                rows = rows[:limit]
                last_biz, last_d = rows[-1]
                # re-encode cursor (shouldn't happen but safe)
                phase_in_cursor = "nearby" if rows[-1][1] is not None and rows[-1][1] <= radius else "farther"
                next_cursor = base64.urlsafe_b64encode(json.dumps({
                    "phase": phase_in_cursor,
                    "last_trust_score": None,
                    "last_distance": rows[-1][1],
                    "last_id": str(rows[-1][0].id),
                    "radius": radius,
                    "f": current_fp
                }).encode()).decode()

        # --- Build response dicts (common to both branches) ---
        business_rows = [b for b, _ in rows]
        cat_ids = {b.category_id for b in business_rows}
        cat_map = {}
        if cat_ids:
            cat_result = await self.db.execute(
                select(Category).where(Category.id.in_(cat_ids))
            )
            for cat in cat_result.scalars().all():
                cat_map[cat.id] = cat.name

        # --- Bulk primary locations ---
        loc_map = {}
        if business_rows:
            loc_bulk = await self.db.execute(
                select(Location).where(
                    Location.business_id.in_([b.id for b in business_rows]),
                    Location.is_primary == True
                )
            )
            for l in loc_bulk.scalars().all():
                loc_map[l.business_id] = l
        # --- Bulk operating hours ---
        hours_map = {}
        if business_rows:
            hours_bulk = await self.db.execute(
                select(OperatingHours)
                .where(OperatingHours.business_id.in_([b.id for b in business_rows]))
                .order_by(OperatingHours.business_id, OperatingHours.day_of_week)
            )
            for h in hours_bulk.scalars().all():
                hours_map.setdefault(h.business_id, []).append(h)

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

            businesses.append({
                "id": str(business.id),
                "name": business.name,
                "category_id": business.category_id,
                "category_name": cat_map.get(business.category_id, "Unknown"),
                "description": business.description,
                "trust_score": float(business.trust_score),
                "logo_url": (
                    f"/api/v1/businesses/{business.id}/logo"
                    if (business.logo_data or business.logo_url)
                    else None
                ),
                "slug": business.slug,
                "distance_meters": round(distance, 2) if distance is not None else None,
                "location": lat_lon,
                "address_text": address_text,
                "cover_url": f"/api/v1/businesses/{business.id}/cover" if business.cover_data else None,
                "operating_hours": hours_list,
            })

        return {"businesses": businesses, "next_cursor": next_cursor}