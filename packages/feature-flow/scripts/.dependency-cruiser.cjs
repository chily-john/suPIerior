/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-pi",
      severity: "error",
      from: { path: "^extension-src/feature-flow/domain/" },
      to: { path: "^extension-src/feature-flow/pi/" },
    },
    {
      name: "templates-no-pi",
      severity: "error",
      from: { path: "^extension-src/feature-flow/templates/" },
      to: { path: "^extension-src/feature-flow/pi/" },
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
