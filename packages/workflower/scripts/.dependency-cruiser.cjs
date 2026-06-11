/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "orchestration-no-pi-adapter",
      severity: "error",
      from: { path: "^extension-src/workflower/internals/workflow-orchestration/" },
      to: { path: "^extension-src/workflower/internals/pi-adapter/" },
    },
    {
      name: "internals-no-index",
      severity: "error",
      from: { path: "^extension-src/workflower/internals/" },
      to: { path: "^extension-src/workflower/index\\.ts$" },
    },
    {
      name: "package-api-no-pi-adapter",
      severity: "error",
      from: { path: "^extension-src/workflower/package-api/" },
      to: { path: "^extension-src/workflower/internals/pi-adapter/" },
    },
    {
      name: "pi-adapter-no-orchestration-foundations",
      severity: "error",
      from: { path: "^extension-src/workflower/internals/pi-adapter/" },
      to: {
        path: "^extension-src/workflower/internals/workflow-orchestration/(definitions|runtime/active-state|runtime/artifacts|prompting)/",
      },
    },
    {
      name: "use-cases-no-sibling-private-types",
      severity: "error",
      from: {
        path: "^extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/(advance|auto-next|generated-starts|manage-active|scope-context|start)/",
      },
      to: {
        path: "^extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/(advance|auto-next|generated-starts|manage-active|scope-context|start)/.*\\.types\\.ts$",
        pathNot:
          "^extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/($1)/",
      },
    },
    {
      name: "orchestration-foundations-no-use-cases",
      severity: "error",
      from: {
        path: "^extension-src/workflower/internals/workflow-orchestration/(definitions|runtime/active-state|runtime/artifacts|prompting)/",
      },
      to: { path: "^extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/" },
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
