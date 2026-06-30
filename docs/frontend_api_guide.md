# Hakika V1 – Frontend API Guide

## Authentication

### Business Owners, Riders, Admins
Register: POST /api/v1/auth/register (body: email, password, role)
Login: POST /api/v1/auth/login -> returns access_token and refresh_token
Refresh: POST /api/v1/auth/refresh (body: refresh_token) -> returns new pair

All protected endpoints require:
Authorization: Bearer <access_token>

### Customers
No account. Obtain session token:
POST /api/v1/auth/customer/session (body: phone) -> returns session_token

## Error Format
All errors follow:
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Description" } }

## Role Access
Customer: Browse, order, confirm delivery, report problem
Owner: Manage businesses, products, orders, riders, view settlements
Rider: View deliveries, mark arrival, record evidence
Admin: Disputes, settlements, business suspension

## Customer Endpoints
GET /categories
GET /businesses/discover?lat=&lon=&radius=&category_id=
GET /businesses/{id}/profile
POST /orders (phone, business_id, items, delivery coordinates)
GET /orders/{id}
POST /orders/{id}/confirm (phone)
POST /orders/{id}/report-problem (phone, reason)

## Business Owner Endpoints
GET/POST /businesses
PUT/DELETE /businesses/{id}
POST /businesses/{id}/products
PUT/DELETE /products/{id}
GET /orders/business/my
PUT /orders/{id}/accept
PUT /orders/{id}/business-cancel
POST/GET /riders/{business_id}
GET /settlements

## Rider Endpoints
GET /delivery/orders/{id}
PUT /delivery/orders/{id}/arrive (gps_lat, gps_lon)
PUT /delivery/orders/{id}/attempt (status, gps_lat, gps_lon)

## Admin Endpoints
GET /admin/settlements
POST /admin/settlements/{id}/process
GET /admin/disputes
PUT /admin/disputes/{id}/resolve
PUT /admin/businesses/{id}/suspend

## Order States
CREATED -> WAITING_BUSINESS_ACCEPTANCE -> ACCEPTED -> PREPARING -> READY_FOR_DELIVERY -> OUT_FOR_DELIVERY -> ARRIVED -> CUSTOMER_CONFIRMED_DELIVERY -> PAYMENT_PENDING -> PAID -> COMPLETED
Cancel: before delivery -> CANCELLED
