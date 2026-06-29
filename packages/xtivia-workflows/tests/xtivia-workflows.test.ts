import { readFile } from "node:fs/promises";
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPrivateSkillsForTests,
  findPrivateSkill,
  listPrivateSkills,
} from "../../workflower/extension-src/workflower/internals/workflow-orchestration/runtime/private-skills/private-skill-registry";

const privateSkillDirectory = "./extension-src/xtivia-workflows/internals/skills";
const readmeUrl = new URL("../README.md", import.meta.url);
const artifactContractUrl = new URL(
  "../extension-src/xtivia-workflows/internals/skills/playwright-artifact-contract.md",
  import.meta.url,
);
const sourceCaptureArtifacts = [
  "page-capture.md",
  "capture/source-desktop.png",
  "capture/source-mobile.png",
  "capture/source.html",
  "capture/dom-summary.json",
  "capture/images.json",
];
const finalizationArtifacts = [
  "final-report.md",
  "verification/target-desktop.png",
  "verification/target-mobile.png",
  "rules-maintenance-suggestions.md",
];

async function loadXtiviaWorkflows(): Promise<Record<string, any>> {
  return import("../extension-src/xtivia-workflows/index");
}

async function loadXtiviaWorkflowManifest(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
}

describe("xtivia-workflows package", () => {
  beforeEach(() => {
    clearPrivateSkillsForTests();
  });

  it("exports and registers one public XTIVIA workflow while hiding private loops", async () => {
    const {
      default: registerXtiviaWorkflows,
      wpMigrationFinalizeWorkflow,
      wpMigrationPlanLoopWorkflow,
      wpMigrationStoriesSplitWorkflow,
      wpMigrationStoryImplementationLoopWorkflow,
      wpPageMigrationWorkflow,
    } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    expect(wpPageMigrationWorkflow).toMatchObject({
      id: "wp-page-migration",
      clearOnStart: true,
      cleanupOnCompletion: false,
      pollen: [
        "site-info.md",
        "page-capture.md",
        "components/atomic-elements.md",
        "components/global-components.md",
        "components/current-page-components.md",
      ],
    });
    expect(wpPageMigrationWorkflow.steps.map((step: any) => step.id)).toEqual([
      "collect-site-info",
      "capture-source-page",
      "discover-atomic-elements",
      "refresh-global-component-inventory",
      "identify-page-components",
      "start-migration-plan-loop",
    ]);

    for (const workflow of [
      wpMigrationFinalizeWorkflow,
      wpMigrationPlanLoopWorkflow,
      wpMigrationStoriesSplitWorkflow,
      wpMigrationStoryImplementationLoopWorkflow,
    ]) {
      expect(workflow).toMatchObject({
        userInvocable: false,
        modelInvocable: true,
      });
    }

    registerXtiviaWorkflows(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:wp-page-migration"]).toBeDefined();
    expect(pi.commands["wf:wp-migration-plan-loop"]).toBeUndefined();
    expect(pi.commands["wf:wp-migration-stories-split"]).toBeUndefined();
    expect(pi.commands["wf:wp-migration-story-implementation-loop"]).toBeUndefined();
    expect(pi.commands["wf:wp-migration-finalize"]).toBeUndefined();
  });

  it("declares XTIVIA workflow skills as private Workflower skills", async () => {
    const pkg = await loadXtiviaWorkflowManifest();

    expect(pkg.pi.skills).toEqual([]);
    expect(pkg.pi.workflowerSkills).toEqual([privateSkillDirectory]);
  });

  it("documents the XTIVIA migration workflow smoke test and artifact policy", async () => {
    const readme = await readFile(readmeUrl, "utf8");

    for (const expectedText of [
      "wp-page-migration",
      "/wf:wp-page-migration <garden-name>",
      ".workflower/workflows/<garden-name>/0001-wp-page-migration/",
      "Playwright",
      "cleanupOnCompletion",
      "rules-maintenance-suggestions.md",
      "/next",
      "/wf status",
      "/wf stop",
      "/wf list",
    ]) {
      expect(readme).toContain(expectedText);
    }
  });

  it("keeps workflow skill commands backed by private skills", async () => {
    const { default: registerXtiviaWorkflows, ...workflows } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    registerXtiviaWorkflows(pi);

    expect(collectSkillCommandNames(Object.values(workflows))).toEqual([
      "discover-atomic-elements",
      "identify-page-components",
      "refresh-global-component-inventory",
      "wp-migration-finalize",
      "wp-migration-plan-create",
      "wp-migration-plan-review",
      "wp-migration-site-info",
      "wp-migration-source-capture",
      "wp-migration-stories-split",
      "wp-migration-story-implement",
      "wp-migration-story-review",
    ]);
    for (const skillName of collectSkillCommandNames(Object.values(workflows))) {
      expect(findPrivateSkill(skillName), `${skillName} private skill`).toBeDefined();
    }
  });

  it("keeps contract-critical skill artifacts declared as workflow outputs or documented contracts", async () => {
    const workflows = await loadXtiviaWorkflows();
    const declaredOutputs = collectWorkflowOutputs(Object.values(workflows));
    const documentedArtifactContracts = [
      await readFile(readmeUrl, "utf8"),
      await readFile(artifactContractUrl, "utf8"),
    ].join("\n");

    for (const artifactPath of [
      "site-info.md",
      "page-capture.md",
      "capture/source-desktop.png",
      "capture/source-mobile.png",
      "capture/source.html",
      "capture/dom-summary.json",
      "capture/images.json",
      "implementation-doc.md",
      "stories",
      "final-report.md",
      "verification/target-desktop.png",
      "verification/target-mobile.png",
      "rules-maintenance-suggestions.md",
    ]) {
      expect(
        declaredOutputs.has(artifactPath) || documentedArtifactContracts.includes(artifactPath),
        `${artifactPath} must be declared or documented`,
      ).toBe(true);
    }
  });

  it("loads site info as a private Workflower skill and matches workflow output", async () => {
    const { default: registerXtiviaWorkflows, wpPageMigrationWorkflow } =
      await loadXtiviaWorkflows();
    const pi = createPiHarness();

    expect(findPrivateSkill("wp-migration-site-info")).toBeUndefined();
    expect(
      wpPageMigrationWorkflow.steps.find((step: any) => step.id === "collect-site-info"),
    ).toMatchObject({
      command: "/skill:wp-migration-site-info",
      outputs: ["site-info.md"],
    });

    registerXtiviaWorkflows(pi);

    const siteInfoSkill = findPrivateSkill("wp-migration-site-info");
    expect(siteInfoSkill).toMatchObject({
      name: "wp-migration-site-info",
      description: expect.stringContaining("site information"),
    });
    expect(listPrivateSkills().map((skill) => skill.name)).toContain("wp-migration-site-info");

    const skillContent = await readFile(siteInfoSkill!.filePath, "utf8");
    expect(skillContent).toContain("source URL");
    expect(skillContent).toContain("target route/path");
    expect(skillContent).toContain("notes or constraints");
    expect(skillContent).toContain("wpMigrationSourceUrl");
    expect(skillContent).toContain("wpMigrationTargetRoute");
    expect(skillContent).toContain("wpMigrationNotes");
    expect(skillContent).toContain("site-info.md");
  });

  it("declares Playwright source capture artifacts", async () => {
    const { wpPageMigrationWorkflow } = await loadXtiviaWorkflows();

    expect(wpPageMigrationWorkflow.steps[1]).toMatchObject({
      id: "capture-source-page",
      command: "/skill:wp-migration-source-capture",
      outputs: sourceCaptureArtifacts,
    });

    const artifactContract = await readFile(artifactContractUrl, "utf8");
    for (const artifact of sourceCaptureArtifacts) {
      expect(artifactContract).toContain(artifact);
    }
  });

  it("loads source capture skill with desktop and mobile contract", async () => {
    const { default: registerXtiviaWorkflows } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    expect(findPrivateSkill("wp-migration-source-capture")).toBeUndefined();

    registerXtiviaWorkflows(pi);

    const sourceCaptureSkill = findPrivateSkill("wp-migration-source-capture");
    expect(sourceCaptureSkill).toMatchObject({
      name: "wp-migration-source-capture",
      description: expect.stringContaining("source page"),
    });

    const skillContent = await readFile(sourceCaptureSkill!.filePath, "utf8");
    expect(skillContent).toContain("1440x900");
    expect(skillContent).toContain("390x844");
    expect(skillContent).toContain("capture/source.html");
    expect(skillContent).toContain("wpMigrationCapturePath");
    expect(skillContent).toContain("wpMigrationSourceUrl");
    expect(skillContent).toContain("wpMigrationTargetRoute");
    expect(skillContent).toContain("wpMigrationNotes");
  });

  it("exports the private migration plan loop workflow", async () => {
    const { wpMigrationPlanLoopWorkflow } = await loadXtiviaWorkflows();

    expect(wpMigrationPlanLoopWorkflow).toMatchObject({
      id: "wp-migration-plan-loop",
      userInvocable: false,
      modelInvocable: true,
      pollen: [
        "implementation-doc.md",
        "components/atomic-elements.md",
        "components/global-components.md",
        "components/current-page-components.md",
      ],
    });
    expect(wpMigrationPlanLoopWorkflow.steps).toEqual([
      {
        id: "create-or-improve-migration-plan",
        command: "/skill:wp-migration-plan-create",
        outputs: ["implementation-doc.md", "implementation-doc.original.md"],
        autoNext: true,
        clearOnNext: true,
      },
      {
        id: "review-migration-plan",
        command: "/skill:wp-migration-plan-review",
        autoNext: true,
        clearOnNext: true,
      },
      {
        id: "route-migration-plan-review",
        command: "/xtivia-workflow-route migration-plan-review",
        autoNext: true,
        clearOnNext: true,
      },
    ]);
  });

  it("loads migration plan private skills and shared quality bars", async () => {
    const { default: registerXtiviaWorkflows } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    registerXtiviaWorkflows(pi);

    const createSkill = findPrivateSkill("wp-migration-plan-create");
    const reviewSkill = findPrivateSkill("wp-migration-plan-review");
    expect(createSkill).toMatchObject({ name: "wp-migration-plan-create" });
    expect(reviewSkill).toMatchObject({ name: "wp-migration-plan-review" });

    const createContent = await readFile(createSkill!.filePath, "utf8");
    expect(createContent).toContain("site-info.md");
    expect(createContent).toContain("page-capture.md");
    expect(createContent).toContain("section-by-section component reuse/build map");

    const reviewContent = await readFile(reviewSkill!.filePath, "utf8");
    expect(reviewContent).toContain("wpMigrationPlanReview");
    expect(reviewContent).toContain("requiredImprovements");
    expect(reviewContent).toContain("score < 4");

    const componentQualityBar = await readFile(
      new URL(
        "../extension-src/xtivia-workflows/internals/skills/migration-plan/component-reuse-quality-bar.md",
        import.meta.url,
      ),
      "utf8",
    );
    expect(componentQualityBar).toContain("reuse existing");
    expect(componentQualityBar).toContain("extend existing");
    expect(componentQualityBar).toContain("create new reusable");
    expect(componentQualityBar).toContain("route-local one-off");

    const reviewQualityBar = await readFile(
      new URL(
        "../extension-src/xtivia-workflows/internals/skills/migration-plan/review-quality-bar.md",
        import.meta.url,
      ),
      "utf8",
    );
    expect(reviewQualityBar).toContain("Playwright capture usage");
    expect(reviewQualityBar).toContain("desktop/mobile coverage");
    expect(reviewQualityBar).toContain(".pi/rules");
    expect(reviewQualityBar).toContain("concrete component decisions");
    expect(reviewQualityBar).toContain("POC-appropriate Playwright verification");
  });

  it("exports story split and story implementation loop workflows", async () => {
    const {
      default: registerXtiviaWorkflows,
      wpMigrationStoriesSplitWorkflow,
      wpMigrationStoryImplementationLoopWorkflow,
    } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    expect(wpMigrationStoriesSplitWorkflow).toMatchObject({
      id: "wp-migration-stories-split",
      userInvocable: false,
      modelInvocable: true,
    });
    expect(wpMigrationStoriesSplitWorkflow.steps).toEqual([
      {
        id: "split-migration-stories",
        command: "/skill:wp-migration-stories-split",
        outputs: ["stories"],
        autoNext: true,
        clearOnNext: true,
      },
      {
        id: "start-migration-story-loop",
        command: "/xtivia-workflow-route migration-stories",
        autoNext: true,
        clearOnNext: true,
      },
    ]);

    expect(wpMigrationStoryImplementationLoopWorkflow).toMatchObject({
      id: "wp-migration-story-implementation-loop",
      userInvocable: false,
      modelInvocable: true,
    });
    expect(wpMigrationStoryImplementationLoopWorkflow.steps).toEqual([
      {
        id: "implement-migration-story",
        command: "/skill:wp-migration-story-implement",
        autoNext: true,
        clearOnNext: true,
      },
      {
        id: "review-migration-story",
        command: "/skill:wp-migration-story-review",
        autoNext: true,
        clearOnNext: true,
      },
      {
        id: "route-migration-story-review",
        command: "/xtivia-workflow-route migration-story-review",
        autoNext: true,
        clearOnNext: true,
      },
    ]);

    registerXtiviaWorkflows(pi);

    const splitSkill = findPrivateSkill("wp-migration-stories-split");
    const implementSkill = findPrivateSkill("wp-migration-story-implement");
    const reviewSkill = findPrivateSkill("wp-migration-story-review");
    expect(splitSkill).toMatchObject({ name: "wp-migration-stories-split" });
    expect(implementSkill).toMatchObject({ name: "wp-migration-story-implement" });
    expect(reviewSkill).toMatchObject({ name: "wp-migration-story-review" });

    const splitContent = await readFile(splitSkill!.filePath, "utf8");
    expect(splitContent).toContain("implementation-doc.md");
    expect(splitContent).toContain("stories/001-implement-hero-section.md");
    expect(splitContent).toContain("wpMigrationStoryManifest");

    const implementContent = await readFile(implementSkill!.filePath, "utf8");
    expect(implementContent).toContain("wpMigrationCurrentStory");
    expect(implementContent).toContain("behavioral-red TDD");
    expect(implementContent).toContain("Playwright");

    const reviewContent = await readFile(reviewSkill!.filePath, "utf8");
    expect(reviewContent).toContain("wpMigrationStoryReview");
    expect(reviewContent).toContain("requiredImprovements");
    expect(reviewContent).toContain("score < 4");
  });

  it("exports finalization workflow with verification artifacts", async () => {
    const { wpMigrationFinalizeWorkflow } = await loadXtiviaWorkflows();

    expect(wpMigrationFinalizeWorkflow).toMatchObject({
      id: "wp-migration-finalize",
      userInvocable: false,
      modelInvocable: true,
    });
    expect(wpMigrationFinalizeWorkflow.steps).toEqual([
      {
        id: "finalize-migration",
        command: "/skill:wp-migration-finalize",
        outputs: finalizationArtifacts,
        autoNext: true,
        clearOnNext: true,
      },
    ]);
  });

  it("loads finalization skill with no rules mutation contract", async () => {
    const { default: registerXtiviaWorkflows } = await loadXtiviaWorkflows();
    const pi = createPiHarness();

    expect(findPrivateSkill("wp-migration-finalize")).toBeUndefined();

    registerXtiviaWorkflows(pi);

    const finalizeSkill = findPrivateSkill("wp-migration-finalize");
    expect(finalizeSkill).toMatchObject({ name: "wp-migration-finalize" });

    const skillContent = await readFile(finalizeSkill!.filePath, "utf8");
    expect(skillContent).toContain("wpMigrationStatus");
    expect(skillContent).toContain("rules-maintenance-suggestions.md");
    expect(skillContent).toContain("Do not mutate .pi/rules");
  });
});

function collectSkillCommandNames(workflows: any[]): string[] {
  return workflows
    .flatMap((workflow) => workflow?.steps ?? [])
    .map((step) => step.command)
    .filter(
      (command): command is string => typeof command === "string" && command.startsWith("/skill:"),
    )
    .map((command) => command.slice("/skill:".length).trim().split(/\s+/, 1)[0])
    .sort();
}

function collectWorkflowOutputs(workflows: any[]): Set<string> {
  return new Set(
    workflows
      .flatMap((workflow) => workflow?.steps ?? [])
      .flatMap((step) => (Array.isArray(step.outputs) ? step.outputs : [])),
  );
}

function createPiHarness(): {
  commands: Record<string, any>;
  tools: Record<string, any>;
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  messageRenderers: Record<string, any>;
  registerCommand: (name: string, command: any) => void;
  registerTool: (tool: any) => void;
  registerMessageRenderer: (name: string, renderer: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
} {
  return {
    commands: {},
    tools: {},
    handlers: {},
    sentUserMessages: [],
    messageRenderers: {},
    registerCommand(name, command) {
      this.commands[name] = command;
    },
    registerTool(tool) {
      this.tools[tool.name] = tool;
    },
    registerMessageRenderer(name, renderer) {
      this.messageRenderers[name] = renderer;
    },
    on(name, handler) {
      this.handlers[name] ??= [];
      this.handlers[name].push(handler);
    },
    sendUserMessage(prompt, options) {
      this.sentUserMessages.push({ prompt, options });
    },
  };
}
