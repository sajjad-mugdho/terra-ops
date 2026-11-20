# Terra Supply Co.

The software that runs Terra Supply Co.: customers order supplies from Earth, planet managers accept orders, captains deliver them, and the Grand Admiral sees what each planet earns.

> Work in progress. All decisions live in [docs/context.md](docs/context.md).

## Run locally

Needs Node 24+ and Docker.

```bash
npm install
cp .env.example .env        # then set BETTER_AUTH_SECRET: openssl rand -base64 32
npm run db:up               # Postgres 17 on localhost:5434
npm run db:migrate
npm run dev                 # http://localhost:3000
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
