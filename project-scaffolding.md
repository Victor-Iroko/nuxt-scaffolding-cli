## Prerequisites & Initialization

**Tech Stack:** Bun, Git, VSCode, Docker.

Initialize Project

```
bun create nuxt@latest
```

## Install and Configure Nuxt Modules

Install official modules during the initialization process

1. [`@nuxt/ui`](https://ui.nuxt.com/docs/getting-started/installation/nuxt): Follow installation docs
2. [`@nuxt/eslint`](https://eslint.nuxt.com/packages/module#quick-setup)
   - Add other rules (e.g. `no-console`) to your `eslint.config.mjs` file
   - Add `lint` and `lint:fix` scripts to your `package.json`
   ```json
   "lint": "eslint",
   "lint:fix": "eslint --fix",
   ```
3. [`@nuxt/test-utils`](https://nuxt.com/docs/4.x/getting-started/testing)
   - Follow the installation docs
   - Add `test`, `test:unit`, `test:nuxt`, `test:watch`, and `test:related` scripts in your `package.json`.
   ```json
   "test": "vitest --passWithNoTests",
   "test:unit": "vitest --project unit",
   "test:nuxt": "vitest --project nuxt",
   "test:watch": "vitest --watch",
   "test:related": "vitest related --run"
   ```
4. [`@nuxt/content`](https://content.nuxt.com/docs/getting-started/installation#create-your-first-collection) (optional): Configure collections in `content.config.ts`.
5. [`@pinia/nuxt`](https://nuxt.com/modules/pinia): Follow installation docs
6. [`pinia-plugin-persistedstate/nuxt`](https://nuxt.com/modules/pinia-plugin-persistedstate): Follow installation docs
7. [`@vueuse/nuxt`](https://nuxt.com/modules/vueuse): Follow installation docs
8. [`@vueuse/motion`](https://motion.vueuse.org/getting-started/introduction): Follow installation docs
9. [`@nuxtjs/seo`](https://nuxtseo.com/docs/nuxt-seo/getting-started/installation): Follow installation docs (more configuration guide is coming)
10. [`nuxt-security`](https://nuxt-security.vercel.app/getting-started/installation)
    - Enable `csrf` in the nuxt config
    - (More configuration guide is coming)
11. [`@nuxt/image`](https://image.nuxt.com/get-started/configuration) (optional): Configure a default provider (e.g., Vercel, IPX) if using one.
12. [`@nuxtjs/mdc`](https://nuxt.com/modules/mdc): Run the installation command

## Environment variables validation

1. Install zod and the dotenv cli

```
bun add zod
```

```
bun add -d dotenv-cli
```

2. Add the [error handling function](../../typescript/error-handling-utilities.md) in `shared/utils/error-handling.ts`
3. Create your validation schema in `shared/utils/env-schema.ts`
4. Create a Nitro plugin to validate `process.env` in `server/plugins/env-validate.ts` using th zod schema

## Storage

1. Create your `docker-compose.yml` file in your root directory and add the different kinds storage you'll be using in your app e.g. `postgres`, `mongo`, `minio` (for s3 compatibility storage),`redis`, `qdrant`.
2. Add the necessary environment variables for the docker file

```python
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DB=

DATABASE_URL=
# scheme://user:password@host:port/database?options

MONGO_INITDB_ROOT_USERNAME=
MONGO_INITDB_ROOT_PASSWORD=

MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=

REDIS_PORT=
REDIS_PASSWORD=
REDIS_URL=
# scheme://[:password@]host:port[/db_number]

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

3. Add lifecycle scripts to `package.json`

```json
"db:start": "docker compose up -d",
"db:stop": "docker compose stop",
"db:down": "docker compose down",
"db:destroy": "docker compose down -v"
```

4. Install and configure your ORM (Here we'll show [drizzle](https://orm.drizzle.team/docs/get-started) as an example)
   - Install drizzle (no pg driver here, use the bun's sql api)
     > If you're using bun native pg driver, you need to run `bun --bun run dev` and likewise for build to prevent bun from using a node layer to run the application and not recogize the bun pg driver.
   ```
   bun add drizzle-orm drizzle-zod
   ```
   ```
   bun add -d drizzle-kit drizzle-seed postgres
   ```
   > We still need `postgres` package for the cli to run migrations and for the studio to work
   - Create your schema in `server/database/schema` folder (exporting everything in the `index.ts` file)
   - Create your `drizzle.config.ts` file
   - Create your `server/utils/db.ts` file
   - Add scripts to your `package.json`
   ```json
   "db:generate": "drizzle-kit generate",
   "db:migrate": "dotenv -e .env -- drizzle-kit migrate"
   "db:seed": "bun run ./server/database/seed.ts",
   "db:studio": "dotenv -e .env -- drizzle-kit studio"
   ```
   - Generate your migrations and run it
   - Create your seed script in `server/database/seed.ts`
   - Run your seed script
5. Add your caching / redis configuration (if you're using redis apart from caching)
   > Info!!!
   >
   > Even if you're using redis for caching purposes don't use `cache` as your storage name for it as nuxt uses it for some internal things and it might not work as expected, instead use something like `redis`.
   ```typescript
   nitro: {
       storage: {
       redis: {
           driver: 'redis',
           url: process.env.REDIS_URL || 'redis://localhost:6379',
       },
       },
   },
   ```
6. Create your databases on where you'll be hosting them (e.g. prisma postgres, upstash, Cloudinary, etc.), for both production and testing

## Development Tooling

1. Install Dev Dependencies

```
bun add concurrently husky lint-staged prettier prettier-plugin-tailwindcss -d
```

2. Add format scripts to your `package.json`

```json
"format": "prettier --check .",
"format:fix": "prettier --write ."
```

3. Setup [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)

4. Add a `dev:full` script to your `package.json`

```json
"dev:all": "concurrently -k -n \"APP,DB,STUDIO\" -c \"blue,green,magenta\" \"bun --bun run dev\" \"docker compose up\" \"bun run db:studio\"",
```

5. Initialize Husky

```
bunx husky init
```

6. Add `lint-staged` to your `package.json`

```json
"lint-staged": {
    "*.{ts,vue,js,json}": [
      "bun lint",
      "bun format",
      "bun test:related"
    ]
  }
```

7. Add your precommit hooks

```precommit
bun exec lint-staged
```

8. Add [`commitlint`](https://commitlint.js.org/guides/getting-started.html) to your project - Follow the installation docs
9. Add extension recommendations to your `.vscode/extensions.json`

## Auth, Services & Monitoring

1. Authentication ([Better auth](https://www.better-auth.com/docs/installation))
   - Follow the installation docs
   - Add your auth store in `app/stores/auth-store.ts`
   - Add your auth plugin (for initialization) in `app/plugins/auth-plugin.ts`
   - Add your middleware for frontend (global) in `app/middleware/auth-middleware.global.ts`
   - Add the user types to the event context in `server/types/h3.ts`
   - Add a session check in `server/utils/session.ts`
2. Services (common services)
   - Email: Nodemailer (with gmail) / Resend
   - Payments: Paystack
   - AI: AI-SDK, Open Router / Vercel AI Gateway
3. Monitoring
   - Sentry: `@nuxt/sentry` module
   - Better stack

## Testing, Docs & CI/CD

1. Testing
   - Create a tests directory, `test/` with subfolders for `unit/`, `e2e/`, and `nuxt/`.
2. Documentation
   - Set up a `/docs` folder using `docus`.
3. Github Actions

   - `production.yml`: Create a workflow with two jobs on push or pull request to the main branch
     - Job 1: To lint (`bun lint`), format (`bun format`), build (`bun run build`) and test (`bun run test`)
     - Job 2: To to run migrations (`db:migrate`)
   - `preview.yml`: Create a workflow to run two jobs on push or pull request to the preview branch

     - Job 1: To lint (`bun lint`), format (`bun format`), build (`bun run build`) and test (`bun run test`)
     - Job 2: To to run migrations (`db:migrate`) on your test database.

### Deployment

1. Github
   - Create your github repository
   - Add your github secrets
     - Production and testing database urls for migrations
     - Any other github secrets
2. Hosting
   - Create your project on your hosting provider (e.g. Vercel, etc.) and link it to your github project
   - Add the environmental variables that you need to your project
   - Deploy your application
