import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerFeatureCommand } from "@pi/register";

export default function featureFlow(pi: ExtensionAPI): void {
  registerFeatureCommand(pi);
}

export { runFeatureWorkflow } from "@app/workflow";
export { defaultFeatureFlowConfig, loadFeatureFlowConfig, mergeConfig } from "@domain/config";
export { resolveArtifactPaths, findNearestPiRoot } from "@domain/paths";
export { proposeSlug, sanitizeSlug } from "@domain/slug";
