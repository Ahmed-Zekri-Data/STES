# Documentation

- [setup-mongodb.md](setup-mongodb.md) – installing and starting MongoDB locally
- [deployment.md](deployment.md) – deployment guide

## Implementation notes

`implementation-notes/` holds the write-ups produced while each feature was
built (animations, notifications, order tracking, payments, …). They record
intent at the time and are not kept up to date; where they disagree with the
code, the code is correct.

## Manual API scripts

`backend/scripts/manual/` holds ad-hoc scripts that call a running backend
on http://localhost:9000. Run the Node ones from the repository root, e.g.
`node backend/scripts/manual/test-products-api.js`.
