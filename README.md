# create-nuxt-stack

A CLI tool to scaffold production-ready Nuxt projects with modules, storage, authentication, and development tooling.

## Features

- **Interactive prompts** - Select only the modules, storage, and auth solutions you need
- **Modular architecture** - Pick from recommended community Nuxt modules
- **Authentication** - Secure authentication with [Better Auth](https://www.better-auth.com/) (Email/Password, OAuth)
- **Storage options** - PostgreSQL, MongoDB, MinIO, Redis, Qdrant with Docker Compose
- **ORM support** - Choose between [Drizzle ORM](https://orm.drizzle.team/) or [Prisma](https://www.prisma.io/)
- **Dev tooling** - Prettier, Husky, lint-staged, commitlint pre-configured
- **Auto-configuration** - Official modules (`@nuxt/ui`, `@nuxt/eslint`, `@nuxt/test-utils`) are automatically configured if installed
- **CI/CD ready** - GitHub Actions workflows included
- **Type-safe** - Zod-validated environment variables
- **Fast setup** - Batched dependency installation
- **Dry-run mode** - Preview changes before applying them

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) (optional, for storage services)

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd nuxt-scaffolding-cli

# Install dependencies
bun install

# Run the scaffolder
bunx create-nuxt-stack
```

## Running the CLI

After cloning, you have three options:

### Option 1: Using `bunx` (Recommended)

```bash
bunx create-nuxt-stack
```

### Option 2: Link Globally

```bash
bun link
create-nuxt-stack
```

> **Note**: Ensure `~/.bun/bin` (macOS/Linux) or Bun's global bin path (Windows: `bun pm bin -g`) is in your PATH.

### Option 3: Direct Script Execution

```bash
bun run scaffold.ts
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without creating files |

```bash
bunx create-nuxt-stack --dry-run
```

## Interactive Prompts

### 1. Project Name

The name of your project. Use `.` to scaffold in the current directory.

### 2. Community Modules

| Module | Description |
|--------|-------------|
| `@pinia/nuxt` | State management + persistedstate |
| `@vueuse/nuxt` | Vue Composition Utilities |
| `@vueuse/motion` | Animation directives |
| `@nuxtjs/seo` | Complete SEO solution |
| `nuxt-security` | Security headers based on OWASP Top 10 |
| `@nuxtjs/mdc` | Markdown components |

> **Note**: Official modules like `@nuxt/ui`, `@nuxt/eslint`, and `@nuxt/test-utils` are automatically configured if you install them via the Nuxt CLI setup.

### 3. Storage Options

| Storage | Description |
|---------|-------------|
| PostgreSQL | Relational database |
| MongoDB | Document database |
| MinIO | S3-compatible object storage |
| Redis | In-memory cache/session store |
| Qdrant | Vector database for AI/embeddings |

### 4. ORM Selection

Shown when PostgreSQL is selected:

| ORM | Description |
|-----|-------------|
| Drizzle | TypeScript ORM with Bun native driver support |
| Prisma | Next-generation Node.js ORM |
| None | Skip ORM setup |

### 5. Authentication

| Option | Description |
|--------|-------------|
| Better Auth | Full-featured auth with sessions, OAuth support |
| None | Skip auth setup |

### 6. Email Service

Shown when Better Auth is selected:

| Service | Description |
|---------|-------------|
| Nodemailer | Email via Gmail SMTP |
| None | Skip email setup |

## Generated Project Structure

```
my-project/
├── .github/
│   └── workflows/
│       ├── production.yml
│       └── preview.yml
├── .husky/
│   ├── commit-msg
│   └── pre-commit
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── app/
│   ├── app.vue
│   ├── assets/css/main.css
│   ├── middleware/                 # If Better Auth
│   │   └── auth-middleware.global.ts
│   ├── plugins/                    # If Better Auth + Pinia
│   │   └── auth-plugin.ts
│   ├── stores/                     # If Better Auth + Pinia
│   │   └── auth-store.ts
│   └── utils/
│       └── auth-client.ts          # If Better Auth
├── server/
│   ├── api/auth/
│   │   └── [...all].ts             # If Better Auth
│   ├── database/
│   │   ├── schema/index.ts         # If Drizzle
│   │   ├── migrations/             # If Drizzle
│   │   └── seed.ts                 # If Drizzle
│   ├── plugins/
│   │   └── env-validate.ts
│   ├── types/
│   │   └── h3.ts                   # If Better Auth
│   └── utils/
│       ├── auth.ts                 # If Better Auth
│       ├── db.ts                   # If ORM selected
│       ├── email.ts                # If Nodemailer
│       └── session.ts              # If Better Auth
├── shared/utils/
│   ├── env-schema.ts
│   ├── error-handling.ts
│   └── index.ts
├── tests/
│   ├── e2e/
│   ├── nuxt/
│   └── unit/
├── .env
├── .env.example
├── .prettierrc
├── .prettierignore
├── commitlint.config.js
├── docker-compose.yml              # If storage selected
├── drizzle.config.ts               # If Drizzle
├── nuxt.config.ts
└── package.json
```

## Generated Scripts

The following scripts are added to your `package.json`:

### Core

```json
{
  "dev": "nuxt dev",
  "build": "nuxt build",
  "dev:all": "concurrently -k -n \"APP,DB,STUDIO\" -c \"blue,green,magenta\" \"bun --bun run dev\" \"docker compose up\" \"bun run db:studio\""
}
```

### Linting & Formatting

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --check .",
  "format:fix": "prettier --write ."
}
```

### Testing

```json
{
  "test": "vitest --passWithNoTests",
  "test:unit": "vitest --project unit",
  "test:watch": "vitest --watch"
}
```

### Database (if storage selected)

```json
{
  "db:start": "docker compose up -d",
  "db:stop": "docker compose stop",
  "db:down": "docker compose down",
  "db:destroy": "docker compose down -v",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "dotenv -e .env -- drizzle-kit migrate",
  "db:seed": "bun run ./server/database/seed.ts",
  "db:studio": "dotenv -e .env -- drizzle-kit studio"
}
```

## Post-Scaffold Setup

### Better Auth

If you selected Better Auth with an ORM, generate the auth schema:

```bash
# Generate auth tables
bunx @better-auth/cli generate --config ./server/utils/auth.ts --output ./server/database/schema

# Run migrations
bun run db:generate && bun run db:migrate
```

### Gmail SMTP (Nodemailer)

If you selected Nodemailer for email:

1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add to your `.env` file:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-app-password
   ```

## Troubleshooting

### "command not found" after `bun link`

Ensure Bun's global bin directory is in your PATH:

- **macOS/Linux**: Add `export PATH="$HOME/.bun/bin:$PATH"` to your shell profile
- **Windows**: Run `bun pm bin -g` to find the path, then add it to your system PATH

### Husky hooks not running

Ensure the hooks are executable:

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

## Development

```bash
# Install dependencies
bun install

# Run the CLI locally
bun run scaffold.ts

# Dry run (preview mode)
bun run scaffold:dry

# Type check
bunx tsc --noEmit
```

## Unlink

To remove the globally linked command:

```bash
bun unlink
```

## License

MIT
