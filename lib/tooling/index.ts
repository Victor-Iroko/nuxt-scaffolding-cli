import { join } from "path";
import type { ScaffoldConfig } from "../types";
import {
  exec,
  writeFile,
  addScriptsToPackageJson,
  updatePackageJson,
  logger,
} from "../utils";

export const TOOLING_PACKAGES = {
  devDeps: [
    "concurrently",
    "husky",
    "lint-staged",
    "prettier",
    "prettier-plugin-tailwindcss",
    "@commitlint/cli",
    "@commitlint/config-conventional",
  ],
};

export async function setupTooling(config: ScaffoldConfig): Promise<boolean> {
  logger.title("Setting up Development Tooling");

  let allSuccess = true;

  logger.step("Configuring Prettier...");

  const prettierConfig = `{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./app/assets/css/main.css",
  "tailwindAttributes": [":ui"],
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
`;

  writeFile(join(config.projectPath, ".prettierrc"), prettierConfig, {
    dryRun: config.dryRun,
  });

  const prettierIgnore = `node_modules
.nuxt
.output
dist
*.min.js
`;

  writeFile(join(config.projectPath, ".prettierignore"), prettierIgnore, {
    dryRun: config.dryRun,
  });

  addScriptsToPackageJson(
    config.projectPath,
    {
      format: "prettier --check .",
      "format:fix": "prettier --write .",
    },
    { dryRun: config.dryRun }
  );

  logger.step("Initializing Husky...");

  if (!config.dryRun) {
    await exec("bunx husky init", { cwd: config.projectPath });
  } else {
    logger.command("bunx husky init");
  }

  const preCommitHook = `#!/bin/sh
bun exec lint-staged
`;

  writeFile(join(config.projectPath, ".husky", "pre-commit"), preCommitHook, {
    dryRun: config.dryRun,
  });

  updatePackageJson(
    config.projectPath,
    (pkg) => ({
      ...pkg,
      "lint-staged": {
        "*.{ts,vue,js,json}": ["bun lint", "bun format", "bun test:related"],
      },
    }),
    { dryRun: config.dryRun }
  );

  logger.step("Setting up commitlint...");

  const commitlintConfig = `export default {
  extends: ['@commitlint/config-conventional'],
}
`;

  writeFile(
    join(config.projectPath, "commitlint.config.js"),
    commitlintConfig,
    {
      dryRun: config.dryRun,
    }
  );

  const commitMsgHook = `#!/bin/sh
bunx --no-install commitlint --edit "$1"
`;

  writeFile(join(config.projectPath, ".husky", "commit-msg"), commitMsgHook, {
    dryRun: config.dryRun,
  });

  if (config.storage.length > 0) {
    const devAllScript =
      'concurrently -k -n "APP,DB,STUDIO" -c "blue,green,magenta" "bun --bun run dev" "docker compose up" "bun run db:studio"';

    addScriptsToPackageJson(
      config.projectPath,
      {
        "dev:all": devAllScript,
      },
      { dryRun: config.dryRun }
    );
  }

  const vsCodeSettings = `{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": "on"
  },
  "tailwindCSS.classAttributes": ["class", "ui"],
  "tailwindCSS.experimental.classRegex": [
    ["ui:\\\\s*{([^)]*)\\\\s*}", "(?:'|\\"|\`)([^']*)(?:'|\\"|\`)"]
  ],
  "eslint.useFlatConfig": true
}
`;

  writeFile(
    join(config.projectPath, ".vscode", "settings.json"),
    vsCodeSettings,
    {
      dryRun: config.dryRun,
    }
  );

  const vsCodeExtensions = `{
  "recommendations": [
    "vue.volar",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "antfu.iconify",
    "antfu.file-nesting"
  ]
}
`;

  writeFile(
    join(config.projectPath, ".vscode", "extensions.json"),
    vsCodeExtensions,
    {
      dryRun: config.dryRun,
    }
  );

  logger.success("Development tooling configured");
  return allSuccess;
}
