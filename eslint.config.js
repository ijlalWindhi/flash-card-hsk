//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    ignores: [
      "eslint.config.js",
      ".prettierrc",
      // Build output. Nobody edits it, and once a build has been run its
      // bundled JavaScript makes `npm run lint` report hundreds of errors
      // about code the linter did not write and cannot fix.
      ".output/**",
      ".vercel/**",
      "dist/**",
    ],
  },
]
