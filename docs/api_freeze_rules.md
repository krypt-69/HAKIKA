# Hakika V1 API Freeze Rules

After Phase 15.10, the V1 API is frozen. Future changes:

Allowed (no version change):
- Add a new endpoint
- Add an optional field to a response
- Add a new query parameter (if optional)
- Fix a bug that does not change the contract

Not allowed (requires /api/v2):
- Rename or remove an existing field
- Change the authentication flow
- Change the order state machine
- Remove an endpoint
- Change HTTP method of an existing endpoint
