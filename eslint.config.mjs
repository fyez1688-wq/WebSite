import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-build/**",
      ".next-final/**",
      ".next-local-build/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  ...next
];

export default eslintConfig;
