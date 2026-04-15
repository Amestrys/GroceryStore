# GroceryStore

## Bruno API testing

This repository includes a minimal Bruno collection in `./bruno`.
The default local environment targets `http://localhost:3000` and calls `GET /api/products`.
The sample assertion expects `/api/products` to return a JSON array of products, where each product has at least `id` and `name`.

### Run

```bash
bru run ./bruno --env local
```
