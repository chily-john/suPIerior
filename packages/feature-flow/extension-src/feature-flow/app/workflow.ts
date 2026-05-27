import { rm, writeFile } from "node:fs/promises";
import { createDefaultKanbanConverterRegistry } from "@supierior/kanban-converters";
import type { PiQuestionUi } from "@supierior/tui-tools";
import { runDiscoveryLoop } from "@app/discovery-loop";
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
  ui: PiQuestionUi & {
    notify?: (message: string, level?: "info" | "warning" | "error") => void;
  };
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
    description =
      (await ctx.ui.input("Feature idea", "Describe the feature to plan"))?.trim() ?? "";
  }
  if (!description) {
    ctx.ui.notify?.("Feature workflow cancelled: no description provided.", "warning");
    return undefined;
  }

  const initialPaths = await resolveArtifactPaths(ctx.cwd, proposeSlug(description));
  const config = await loadFeatureFlowConfig(initialPaths.piRoot);
  const slug = await chooseSlug(ctx, description);
  const paths = await resolveArtifactPaths(ctx.cwd, slug);

  if (await featureDirExists(paths)) {
    const replace = await ctx.ui.confirm(
      "Replace existing feature?",
      `.pi/features/${slug} already exists. Replace its feature artifacts?`,
    );
    if (!replace) {
      const revised = sanitizeSlug(
        (await ctx.ui.input("Feature slug", `${slug}-2`)) ?? `${slug}-2`,
      );
      return runFeatureWorkflowWithSlug(description, revised, ctx);
    }
  }

  await ensureFeatureDir(paths);
  const modelAdapter = createDiscoveryModelAdapter(ctx);
  const discoveryState = await runDiscoveryLoop({ description, slug, ctx, config, modelAdapter });
  const discovery = summarizeDiscovery(description, slug, discoveryState);

  const draft = renderDraft(discovery);
  const featureTemplate = await chooseFeatureTemplate(ctx, paths.piRoot);
  const featureDocument = await generateFeatureDocument(modelAdapter, discovery, featureTemplate);
  await writeFile(paths.draftPath, draft, "utf8");
  await writeFile(paths.featurePath, featureDocument, "utf8");
  await writeFile(paths.planPath, renderPlan(discovery), "utf8");
  await rm(paths.draftPath, { force: true });

  const featurePath = relativeArtifactPath(ctx.cwd, paths.featurePath);
  const planPath = relativeArtifactPath(ctx.cwd, paths.planPath);
  ctx.ui.notify?.(`Feature artifacts written: ${featurePath}, ${planPath}`, "info");
  await runConfiguredNextStep(config, { ctx, paths, modelAdapter });
  return { slug, featurePath, planPath };
}

async function runFeatureWorkflowWithSlug(
  description: string,
  slug: string,
  ctx: FeatureWorkflowContext,
): Promise<FeatureWorkflowResult | undefined> {
  const paths = await resolveArtifactPaths(ctx.cwd, slug);
  if (await featureDirExists(paths)) {
    const replace = await ctx.ui.confirm(
      "Replace existing feature?",
      `.pi/features/${slug} already exists. Replace its feature artifacts?`,
    );
    if (!replace) return undefined;
  }
  await ensureFeatureDir(paths);
  const config = await loadFeatureFlowConfig(paths.piRoot);
  const modelAdapter = createDiscoveryModelAdapter(ctx);
  const discoveryState = await runDiscoveryLoop({ description, slug, ctx, config, modelAdapter });
  const discovery = summarizeDiscovery(description, slug, discoveryState);
  const featureTemplate = await chooseFeatureTemplate(ctx, paths.piRoot);
  const featureDocument = await generateFeatureDocument(modelAdapter, discovery, featureTemplate);
  await writeFile(paths.draftPath, renderDraft(discovery), "utf8");
  await writeFile(paths.featurePath, featureDocument, "utf8");
  await writeFile(paths.planPath, renderPlan(discovery), "utf8");
  await rm(paths.draftPath, { force: true });
  await runConfiguredNextStep(config, { ctx, paths, modelAdapter });
  return {
    slug,
    featurePath: relativeArtifactPath(ctx.cwd, paths.featurePath),
    planPath: relativeArtifactPath(ctx.cwd, paths.planPath),
  };
}

async function chooseFeatureTemplate(
  ctx: FeatureWorkflowContext,
  piRoot: string,
): Promise<SelectedFeatureTemplate> {
  const customOptions = await discoverFeatureTemplateOptions(piRoot);
  if (customOptions.length === 0) {
    return loadSelectedFeatureTemplate(piRoot, undefined, defaultFeatureDocumentTemplate);
  }

  const options: FeatureTemplateOption[] = [
    { label: defaultFeatureTemplateLabel },
    ...customOptions,
  ];
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

async function chooseSlug(ctx: FeatureWorkflowContext, description: string): Promise<string> {
  const proposed = proposeSlug(description);
  const ok = await ctx.ui.confirm(
    "Feature slug",
    `Use '${proposed}' for .pi/features/${proposed}?`,
  );
  if (ok) return proposed;
  return sanitizeSlug((await ctx.ui.input("Feature slug", proposed)) ?? proposed);
}

async function runConfiguredNextStep(
  config: FeatureFlowConfig,
  input: {
    ctx: FeatureWorkflowContext;
    paths: Awaited<ReturnType<typeof resolveArtifactPaths>>;
    modelAdapter: DiscoveryModelAdapter;
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
  const proceed = await input.ctx.ui.confirm(
    "Convert feature to kanban work items?",
    `Generate reviewable kanban work items from ${featurePath} using '${nextStep.converter}'?`,
  );
  if (!proceed) {
    input.ctx.ui.notify?.("Kanban conversion skipped; feature artifacts were left intact.", "info");
    return;
  }

  const registry = createDefaultKanbanConverterRegistry();
  const converter = registry.resolve(nextStep.converter);
  await converter.convert({
    cwd: input.ctx.cwd,
    featureDir: input.paths.featureDir,
    featurePath: input.paths.featurePath,
    modelAdapter: input.modelAdapter,
    ui: input.ctx.ui,
    config: converterConfig(config, nextStep.converter),
  });
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
