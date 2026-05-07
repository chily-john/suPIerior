/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "shared-no-architecture-imports",
      severity: "error",
      from: { path: "^extension-src/pi-rules/shared/" },
      to: { path: "^extension-src/pi-rules/(app|domain|features|pi)/" },
    },
    {
      name: "domain-no-features-or-pi",
      severity: "error",
      from: { path: "^extension-src/pi-rules/domain/" },
      to: { path: "^extension-src/pi-rules/(features|pi)/" },
    },
    {
      name: "features-no-pi",
      severity: "error",
      from: { path: "^extension-src/pi-rules/features/" },
      to: { path: "^extension-src/pi-rules/pi/" },
    },
    {
      name: "no-pi-imports-outside-pi",
      severity: "error",
      from: {
        path: "^extension-src/pi-rules/(app|domain|features|shared)/",
      },
      to: { path: "^extension-src/pi-rules/pi/" },
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
