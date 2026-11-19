import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Class names are composed with cn() (clsx + tailwind-merge) only.
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > :matches(TemplateLiteral, BinaryExpression, ConditionalExpression, LogicalExpression)",
          message:
            "Compose class names with cn() from @/lib/utils, not template strings, concatenation or inline conditionals.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "clsx", message: "Use cn() from @/lib/utils." },
            { name: "tailwind-merge", message: "Use cn() from @/lib/utils." },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/utils.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
