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
