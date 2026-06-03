/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-pi",
      severity: "error",
      from: { path: "^extension-src/workflower/domain/" },
      to: { path: "^extension-src/workflower/pi/" },
    },
    {
      name: "templates-no-pi",
      severity: "error",
      from: { path: "^extension-src/workflower/templates/" },
      to: { path: "^extension-src/workflower/pi/" },
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
