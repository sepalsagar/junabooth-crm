# Junabooth CRM

Internal CRM foundation for Junabooth photo-booth rentals.

Copy `.env.example` to `.env`, add the Supabase pooled and direct connection URLs, then run:

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Commands: `npm run build`, `npm run lint`, `npm test`, `npm run db:seed`, and `npm run db:studio`.

## Authentication

Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the optional `SEED_PARTNER_*`
values in `.env`. Public sign-up is disabled. Partner seed accounts are created
through Better Auth's server API and their passwords are generated unless explicitly
configured locally.
# Junabooth CRM

## Local commands

```bash
npm ci
npm run dev
npx prisma migrate deploy
npm run partners:sync
```

Run verification with `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`.

Partner credentials are supplied only through the git-ignored `.env` using the
`SEED_PARTNER_1..4_NAME/EMAIL/PASSWORD` variables. Public sign-up is disabled.
To reset one partner, set `PARTNER_RESET_EMAIL` and `PARTNER_RESET_PASSWORD`,
then run `npm run partners:reset-password`; no secret values are printed.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required only for private
receipt storage. The app remains usable when receipt storage is unavailable.

Deployments should provide the same environment variable names through the
hosting provider and run additive Prisma migrations before starting the app.
