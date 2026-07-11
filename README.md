# NeuralNexus

Your AI personality, in one profile.
Build it just by using NeuralNexus. Then every AI — ChatGPT, Claude, image generators — instantly knows how to talk, write and create for you.
NeuralNexus keeps the preferences that make your work yours, ready to inspect and carry with you.

## Production persistence on Railway

SQLite data must live on a Railway volume so profile signals survive deploys.

1. In Railway, open the NeuralNexus service.
2. Add a Volume and mount it at `/data`.
3. Set `DATABASE_URL` to `file:/data/prod.db`.
4. Deploy. The start command runs `npm run db:ensure && npx prisma db push --skip-generate && npm start`.

Do not use `db push --accept-data-loss` in production. The build step only generates Prisma and builds Next.js. The `db:ensure` step initializes an empty SQLite volume from the checked-in initial migration, then Prisma performs a non-destructive schema sync.

## Product Direction

- Home presents a premium workspace-builder entry point, not a chat list.
- Workspaces package methods, skills, knowledge and outputs into reusable systems.
- Skills are reusable intellectual products with behavior, inputs and output rules.
- Templates provide high-quality starting points for common expert workflows.
- Usage explains model and budget activity in business language.

## Local Setup

1. Install Node.js.
2. Install dependencies with `npm install`.
3. Create `.env` from `.env.example`.
4. Set `DATABASE_URL` for the local SQLite database.
5. Run `npm run setup`.
6. Start the app with `npm run dev`.

API keys are only needed when a workspace generates live AI outputs.
