import { rm, writeFile } from "node:fs/promises";
import { createDefaultKanbanConverterRegistry } from "@supierior/kanban-converters";
import { runDiscoveryLoop } from "@app/discovery-loop";
import type { FeatureFlowUi } from "@app/ui";
import { createFeatureFlowStateController, type FeatureFlowStateController } from "@app/flow-state";
import { loadFeatureFlowConfig, type FeatureFlowConfig } from "@domain/config";
import {
  defaultFeatureTemplateLabel,
  discoverFeatureTemplateOptions,
  loadSelectedFeatureTemplate,
  type FeatureTemplateOption,
  type SelectedFeatureTemplate,
} from "@domain/feature-templates";
import type { DiscoveryModelAdapter } from "@domain/discovery/adapter";
import { summarizeDiscovery, type DiscoveryContext } from "@domain/model";
import {
  ensureFeatureDir,
  featureDirExists,
  relativeArtifactPath,
  resolveArtifactPaths,
} from "@domain/paths";
import { proposeSlug, sanitizeSlug } from "@domain/slug";
import { defaultFeatureDocumentTemplate, renderDraft, renderPlan } from "@templates/artifacts";
import { renderFeatureDocumentPrompt } from "@templates/prompts";

export interface FeatureWorkflowContext {
  cwd: string;
  hasUI?: boolean;
  ui: FeatureFlowUi;
  discoveryModelAdapter?: DiscoveryModelAdapter;
  createDiscoveryModelAdapter?: () => DiscoveryModelAdapter;
}

export interface FeatureWorkflowResult {
  slug: string;
  featurePath: string;
  planPath: string;
}

export async function runFeatureWorkflow(
  rawDescription: string,
  ctx: FeatureWorkflowContext,
): Promise<FeatureWorkflowResult | undefined> {
  let description = rawDescription.trim();
  if (!description) {
    const flowState = createFeatureFlowStateController(ctx.ui);
    flowState.inputReady("Waiting for feature idea");
    try {
      description =
        (await ctx.ui.input("Feature idea", "Describe the feature to plan"))?.trim() ?? "";
    } finally {
      flowState.dispose();
    }
  }
  if (!description) {
    ctx.ui.notify?.("Feature workflow cancelled: no description provided.", "warning");
    return undefined;
  }

  const flowState = createFeatureFlowStateController(ctx.ui);
  try {
    const initialPaths = await flowState.busy("Resolving feature-flow configuration…", () =>
      resolveArtifactPaths(ctx.cwd, proposeSlug(description)),
    );
    const config = await flowState.busy("Loading feature-flow configuration…", () =>
      loadFeatureFlowConfig(initialPaths.piRoot),
    );
    const slug = await chooseSlug(ctx, description, flowState);
    const paths = await flowState.busy("Resolving feature artifact paths…", () =>
      resolveArtifactPaths(ctx.cwd, slug),
    );

    if (
      await flowState.busy("Checking existing feature artifacts…", () => featureDirExists(paths))
    ) {
      flowState.inputReady("Waiting for replace confirmation");
      const replace = await ctx.ui.confirm(
        "Replace existing feature?",
        `.pi/features/${slug} already exists. Replace its feature artifacts?`,
      );
      if (!replace) {
        flowState.inputReady("Waiting for revised feature slug");
        const revised = sanitizeSlug(
          (await ctx.ui.input("Feature slug", `${slug}-2`)) ?? `${slug}-2`,
        );
        return runFeatureWorkflowWithSlug(description, revised, ctx, flowState);
      }
    }

    await flowState.busy("Preparing feature directory…", () => ensureFeatureDir(paths));
    const modelAdapter = createDiscoveryModelAdapter(ctx);
    const discoveryState = await runDiscoveryLoop({
      description,
      slug,
      ctx,
      config,
      modelAdapter,
      flowState,
    });
    const discovery = summarizeDiscovery(description, slug, discoveryState);

    const draft = await flowState.rendering("Rendering feature draft…", async () =>
      renderDraft(discovery),
    );
    const featureTemplate = await chooseFeatureTemplate(ctx, paths.piRoot, flowState);
    const featureDocument = await flowState.busy("Generating feature document…", () =>
      generateFeatureDocument(modelAdapter, discovery, featureTemplate),
    );
    await flowState.busy("Writing feature artifacts…", async () => {
      await writeFile(paths.draftPath, draft, "utf8");
      await writeFile(paths.featurePath, featureDocument, "utf8");
      await writeFile(paths.planPath, renderPlan(discovery), "utf8");
      await rm(paths.draftPath, { force: true });
    });

    const featurePath = relativeArtifactPath(ctx.cwd, paths.featurePath);
    const planPath = relativeArtifactPath(ctx.cwd, paths.planPath);
    await flowState.rendering("Rendering final feature-flow output…", async () => {
      ctx.ui.notify?.(`Feature artifacts written: ${featurePath}, ${planPath}`, "info");
    });
    await runConfiguredNextStep(config, { ctx, paths, modelAdapter, flowState });
    flowState.complete();
    return { slug, featurePath, planPath };
  } finally {
    flowState.dispose();
  }
}

async function runFeatureWorkflowWithSlug(
  description: string,
  slug: string,
  ctx: FeatureWorkflowContext,
  flowState?: FeatureFlowStateController,
): Promise<FeatureWorkflowResult | undefined> {
  const ownsFlowState = !flowState;
  flowState ??= createFeatureFlowStateController(ctx.ui);
  try {
    const paths = await flowState.busy("Resolving feature artifact paths…", () =>
      resolveArtifactPaths(ctx.cwd, slug),
    );
    if (
      await flowState.busy("Checking existing feature artifacts…", () => featureDirExists(paths))
    ) {
      flowState.inputReady("Waiting for replace confirmation");
      const replace = await ctx.ui.confirm(
        "Replace existing feature?",
        `.pi/features/${slug} already exists. Replace its feature artifacts?`,
      );
      if (!replace) return undefined;
    }
    await flowState.busy("Preparing feature directory…", () => ensureFeatureDir(paths));
    const config = await flowState.busy("Loading feature-flow configuration…", () =>
      loadFeatureFlowConfig(paths.piRoot),
    );
    const modelAdapter = createDiscoveryModelAdapter(ctx);
    const discoveryState = await runDiscoveryLoop({
      description,
      slug,
      ctx,
      config,
      modelAdapter,
      flowState,
    });
    const discovery = summarizeDiscovery(description, slug, discoveryState);
    const featureTemplate = await chooseFeatureTemplate(ctx, paths.piRoot, flowState);
    const featureDocument = await flowState.busy("Generating feature document…", () =>
      generateFeatureDocument(modelAdapter, discovery, featureTemplate),
    );
    await flowState.busy("Writing feature artifacts…", async () => {
      await writeFile(paths.draftPath, renderDraft(discovery), "utf8");
      await writeFile(paths.featurePath, featureDocument, "utf8");
      await writeFile(paths.planPath, renderPlan(discovery), "utf8");
      await rm(paths.draftPath, { force: true });
    });
    await runConfiguredNextStep(config, { ctx, paths, modelAdapter, flowState });
    flowState.complete();
    return {
      slug,
      featurePath: relativeArtifactPath(ctx.cwd, paths.featurePath),
      planPath: relativeArtifactPath(ctx.cwd, paths.planPath),
    };
  } finally {
    if (ownsFlowState) flowState.dispose();
  }
}

async function chooseFeatureTemplate(
  ctx: FeatureWorkflowContext,
  piRoot: string,
  flowState?: FeatureFlowStateController,
): Promise<SelectedFeatureTemplate> {
  const customOptions = flowState
    ? await flowState.busy("Loading feature templates…", () =>
        discoverFeatureTemplateOptions(piRoot),
      )
    : await discoverFeatureTemplateOptions(piRoot);
  if (customOptions.length === 0) {
    return loadSelectedFeatureTemplate(piRoot, undefined, defaultFeatureDocumentTemplate);
  }

  const options: FeatureTemplateOption[] = [
    { label: defaultFeatureTemplateLabel },
    ...customOptions,
  ];
  flowState?.inputReady("Waiting for feature template selection");
  const selectedLabel = await ctx.ui.select(
    "Feature document template",
    options.map((option) => option.label),
  );
  const selected = options.find((option) => option.label === selectedLabel);
  return loadSelectedFeatureTemplate(piRoot, selected, defaultFeatureDocumentTemplate);
}

async function generateFeatureDocument(
  modelAdapter: DiscoveryModelAdapter,
  discovery: DiscoveryContext,
  featureTemplate: SelectedFeatureTemplate,
): Promise<string> {
  const document = await modelAdapter.complete(
    renderFeatureDocumentPrompt(discovery, featureTemplate),
  );
  const trimmed = document.trim();
  return `${trimmed || "# Feature\n\nNo feature document was generated."}\n`;
}

async function chooseSlug(
  ctx: FeatureWorkflowContext,
  description: string,
  flowState?: FeatureFlowStateController,
): Promise<string> {
  const proposed = proposeSlug(description);
  flowState?.inputReady("Waiting for feature slug confirmation");
  const ok = await ctx.ui.confirm(
    "Feature slug",
    `Use '${proposed}' for .pi/features/${proposed}?`,
  );
  if (ok) return proposed;
  flowState?.inputReady("Waiting for feature slug");
  return sanitizeSlug((await ctx.ui.input("Feature slug", proposed)) ?? proposed);
}

async function runConfiguredNextStep(
  config: FeatureFlowConfig,
  input: {
    ctx: FeatureWorkflowContext;
    paths: Awaited<ReturnType<typeof resolveArtifactPaths>>;
    modelAdapter: DiscoveryModelAdapter;
    flowState?: FeatureFlowStateController;
  },
): Promise<void> {
  const nextStep = config.nextStep;
  if (!nextStep) return;
  if (nextStep.type !== "kanban-converter") return;
  if (!nextStep.converter) {
    throw new Error(
      "Feature-flow nextStep.type is 'kanban-converter' but no converter was configured.",
    );
  }

  const featurePath = relativeArtifactPath(input.ctx.cwd, input.paths.featurePath);
  input.flowState?.inputReady("Waiting for kanban conversion confirmation");
  const proceed = await input.ctx.ui.confirm(
    "Convert feature to kanban work items?",
    `Generate reviewable kanban work items from ${featurePath} using '${nextStep.converter}'?`,
  );
  if (!proceed) {
    input.ctx.ui.notify?.("Kanban conversion skipped; feature artifacts were left intact.", "info");
    return;
  }

  const converterId = nextStep.converter;
  const registry = createDefaultKanbanConverterRegistry();
  const converter = registry.resolve(converterId);
  const convert = () =>
    converter.convert({
      cwd: input.ctx.cwd,
      featureDir: input.paths.featureDir,
      featurePath: input.paths.featurePath,
      modelAdapter: input.modelAdapter,
      ui: input.ctx.ui,
      config: converterConfig(config, converterId),
    });
  if (input.flowState) {
    await input.flowState.busy("Converting feature to kanban work items…", convert);
  } else {
    await convert();
  }
}

function converterConfig(config: FeatureFlowConfig, converterId: string): unknown {
  const configs = config.kanbanConverters;
  if (!configs) return undefined;
  return configs[converterId] ?? configs[toCamelCase(converterId)];
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function createDiscoveryModelAdapter(ctx: FeatureWorkflowContext): DiscoveryModelAdapter {
  if (ctx.discoveryModelAdapter) return ctx.discoveryModelAdapter;
  if (ctx.createDiscoveryModelAdapter) return ctx.createDiscoveryModelAdapter();
  throw new Error(
    "Feature-flow requires Pi model integration but no model adapter factory was provided.",
  );
}
