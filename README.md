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

```bash
# Clone the repository
git clone <your-repo-url>
cd nuxt-scaffolding-cli

# Install dependencies
bun install
```

### Running the CLI

After cloning, you have three options to run the tool:

#### Option 1: Using `bunx` (Recommended)

```bash
bunx create-nuxt-stack
```

This works immediately without any extra setup. `bunx` executes the package directly by resolving the `bin` entry from `package.json`.

#### Option 2: Link Globally

If you want to use `create-nuxt-stack` as a standalone command from anywhere:

```bash
# Link the package globally
bun link
```

Now you can run `create-nuxt-stack` directly from any directory.

> **Note**: This registers the command in Bun's global bin directory. If you get a "command not found" error, ensure `~/.bun/bin` (macOS/Linux) or Bun's global bin path (Windows: run `bun pm bin -g` to find it) is in your system PATH.

#### Option 3: Direct Script Execution

```bash
bun run scaffold.ts
# or
bun run scaffold
```

This runs the script directly from the project directory.

## Usage

### Create a new project

```bash
# Navigate to where you want to create the project
cd ~/projects

# Run the scaffolder
bunx create-nuxt-stack

# Or if you linked globally
create-nuxt-stack
```

### Dry-run mode

Preview what changes will be made without actually creating files:

```bash
bunx create-nuxt-stack --dry-run

# Or if linked globally
create-nuxt-stack --dry-run
```

## What You'll Be Prompted For

### 1. Project Name
The name of your project (defaults to current directory name).

### 2. Recommended Modules

#### Official Nuxt Modules
| Module | Description |
|--------|-------------|
| `@nuxt/ui` | Intuitive UI Library powered by Tailwind CSS *(temporarily disabled)* |
| `@nuxt/eslint` | ESLint integration with flat config |
| `@nuxt/test-utils` | Testing utilities with Vitest |
| `@nuxt/icon` | 200,000+ icons from Iconify |
| `@nuxt/fonts` | Custom web fonts with performance in mind |
| `@nuxt/scripts` | 3rd-party scripts without sacrificing performance |
| `@nuxt/devtools` | Visual tools to understand your app better |
| `@nuxt/hints` | Performance, security & best practice hints |

#### Community Modules
| Module | Description |
|--------|-------------|
| `@pinia/nuxt` | State management + persistedstate |
| `@vueuse/nuxt` | Vue Composition Utilities |
| `@vueuse/motion` | Animation directives |
| `@nuxtjs/seo` | Complete SEO solution |
| `nuxt-security` | Security based on OWASP Top 10 |
| `@nuxtjs/mdc` | Markdown components |

### 3. Optional Modules (Official)
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

## Known Issues

### @nuxt/ui temporarily disabled

The `@nuxt/ui` module is currently disabled in the selection menu due to a [Bun dependency resolution issue](https://github.com/oven-sh/bun/issues/15529) where `bun install` can get stuck indefinitely at "Resolving dependencies". This is a known Bun issue, not specific to `@nuxt/ui`.

**Workaround**: If you need `@nuxt/ui`, you can manually add it after scaffolding:

```bash
# After scaffolding completes, add @nuxt/ui manually
bun add @nuxt/ui
```

This option will be re-enabled once the Bun issue is resolved.

## Unlink

To remove the globally linked command:

```bash
cd path/to/nuxt-scaffolding-cli
bun unlink
```

## Troubleshooting

### "command not found" after `bun link`

Ensure Bun's global bin directory is in your PATH:
- **macOS/Linux**: Add `export PATH="$HOME/.bun/bin:$PATH"` to your shell profile
- **Windows**: Run `bun pm bin -g` to find the path, then add it to your system PATH

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
