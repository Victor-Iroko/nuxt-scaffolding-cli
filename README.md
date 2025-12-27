# create-nuxt-stack

A CLI tool to scaffold production-ready Nuxt projects with modules, storage, and development tooling.

## Features

- **Interactive prompts** - Select only the modules and storage you need
- **Modular architecture** - Pick from recommended and optional Nuxt modules
- **Storage options** - PostgreSQL, MongoDB, MinIO, Redis, Qdrant with Docker Compose
- **ORM support** - Choose between Drizzle ORM or Prisma
- **Dev tooling** - Prettier, Husky, lint-staged, commitlint pre-configured
- **CI/CD ready** - GitHub Actions workflows included
- **Type-safe** - Zod-validated environment variables
- **Dry-run mode** - Preview changes before applying

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) (optional, for storage)

## Installation

### Option 1: Clone and Link (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd scaffold-cli

# Install dependencies
bun install

# Link globally
bun link
```

Now you can run `create-nuxt-stack` from anywhere!

> **Windows Users**: If you get a PATH error, use the `bunx` method below instead, or add Bun to your system PATH.

### Option 2: Direct Execution

```bash
# Navigate to the scaffold-cli directory
cd path/to/scaffold-cli

# Run directly
bun run scaffold.ts
```

## Usage

### Create a new project

**Using linked command (macOS/Linux):**
```bash
# Navigate to where you want to create the project
cd ~/projects

# Run the scaffolder
create-nuxt-stack
```

**Using bunx (works everywhere including Windows):**
```bash
# Navigate to where you want to create the project
cd ~/projects

# Run via bunx
bunx --bun create-nuxt-stack
```

**Direct execution:**
```bash
# Run from the scaffold-cli directory
bun run scaffold.ts
```

### Dry-run mode

Preview what changes will be made without actually creating files:

```bash
create-nuxt-stack --dry-run

# Or with bunx
bunx --bun create-nuxt-stack --dry-run
```

## What You'll Be Prompted For

### 1. Project Name
The name of your project (defaults to current directory name).

### 2. Recommended Modules
| Module | Description |
|--------|-------------|
| `@nuxt/ui` | Intuitive UI Library powered by Tailwind CSS |
| `@nuxt/eslint` | ESLint integration with flat config |
| `@nuxt/test-utils` | Testing utilities with Vitest |
| `@pinia/nuxt` | State management + persistedstate |
| `@vueuse/nuxt` | Vue Composition Utilities |
| `@vueuse/motion` | Animation directives |
| `@nuxtjs/seo` | Complete SEO solution |
| `nuxt-security` | Security based on OWASP Top 10 |
| `@nuxtjs/mdc` | Markdown components |

### 3. Optional Modules
| Module | Description |
|--------|-------------|
| `@nuxt/content` | File-based CMS with Markdown support |
| `@nuxt/image` | Image optimization with providers |

### 4. Storage Options (Multi-select)
| Storage | Description |
|---------|-------------|
| PostgreSQL | Relational database |
| MongoDB | Document database |
| MinIO | S3-compatible object storage |
| Redis | In-memory cache/store |
| Qdrant | Vector database for AI |

### 5. ORM Selection (if PostgreSQL selected)
| ORM | Description |
|-----|-------------|
| Drizzle | TypeScript ORM with Bun native support |
| Prisma | Next-generation Node.js ORM |

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
│   └── assets/
│       └── css/
│           └── main.css
├── content/                    # If @nuxt/content selected
│   └── index.md
├── server/
│   ├── database/
│   │   ├── schema/
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── plugins/
│   │   └── env-validate.ts
│   └── utils/
│       └── db.ts
├── shared/
│   └── utils/
│       ├── env-schema.ts
│       ├── error-handling.ts
│       └── index.ts
├── tests/
│   ├── e2e/
│   ├── nuxt/
│   └── unit/
│       └── example.test.ts
├── .env
├── .env.example
├── .prettierrc
├── .prettierignore
├── commitlint.config.js
├── content.config.ts           # If @nuxt/content selected
├── docker-compose.yml          # If storage selected
├── drizzle.config.ts           # If Drizzle selected
├── eslint.config.mjs
├── nuxt.config.ts
├── package.json
└── vitest.config.ts
```

## Generated Scripts

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "dev:all": "concurrently -k -n \"APP,DB,STUDIO\" ...",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "test": "vitest --passWithNoTests",
    "test:unit": "vitest --project unit",
    "test:watch": "vitest --watch",
    "db:start": "docker compose up -d",
    "db:stop": "docker compose stop",
    "db:down": "docker compose down",
    "db:destroy": "docker compose down -v",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "dotenv -e .env -- drizzle-kit migrate",
    "db:seed": "bun run ./server/database/seed.ts",
    "db:studio": "dotenv -e .env -- drizzle-kit studio"
  }
}
```

## Unlink

To remove the global command:

```bash
cd path/to/scaffold-cli
bun unlink
```

## Troubleshooting

### Windows: "bun is not installed in %PATH%"

If you see this error when running `create-nuxt-stack`, use one of these alternatives:

1. **Use bunx**: Run `bunx --bun create-nuxt-stack` instead
2. **Direct execution**: Navigate to the scaffold-cli folder and run `bun run scaffold.ts`
3. **Add Bun to PATH**: Ensure Bun's install directory is in your system PATH

### Command not found after bun link

Make sure Bun's global bin directory is in your PATH:
- **macOS/Linux**: `~/.bun/bin`
- **Windows**: Check `bun pm bin -g` for the location

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run scaffold.ts

# Type check
bunx tsc --noEmit
```

## License

MIT
