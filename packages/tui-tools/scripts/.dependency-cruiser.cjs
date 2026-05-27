/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make domain and feature boundaries harder to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "questions-shared-must-not-import-features",
      severity: "error",
      comment:
        "Question shared models/helpers are foundational and must not depend on feature implementations.",
      from: { path: "^extension-src/tui-tools/domains/questions/shared/" },
      to: { path: "^extension-src/tui-tools/domains/questions/features/" },
    },
    {
      name: "questions-queue-must-not-import-asking",
      severity: "error",
      comment:
        "The queue feature is lower-level than asking and must not depend on the asking feature.",
      from: { path: "^extension-src/tui-tools/domains/questions/features/queue/" },
      to: { path: "^extension-src/tui-tools/domains/questions/features/asking/" },
    },
    {
      name: "questions-asking-must-use-queue-entrypoint",
      severity: "error",
      comment: "The asking feature may depend on queue only through the queue feature entrypoint.",
      from: { path: "^extension-src/tui-tools/domains/questions/features/asking/" },
      to: {
        path: "^extension-src/tui-tools/domains/questions/features/queue/(?!index\\.ts$)",
      },
    },
    {
      name: "root-must-import-domain-entrypoints-only",
      severity: "error",
      comment:
        "The package root should expose domain entrypoints, not reach into domain internals.",
      from: { path: "^extension-src/tui-tools/index\\.ts$" },
      to: {
        path: "^extension-src/tui-tools/domains/[^/]+/(?!index\\.ts$)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
