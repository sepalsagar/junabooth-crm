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
