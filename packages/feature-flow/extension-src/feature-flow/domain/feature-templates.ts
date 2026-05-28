import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const defaultFeatureTemplateLabel = "Default PRD-style handoff";

export interface FeatureTemplateOption {
  label: string;
  fileName?: string;
}

export interface SelectedFeatureTemplate {
  label: string;
  content: string;
  source: "default" | "custom";
  fileName?: string;
}

export async function discoverFeatureTemplateOptions(
  piRoot: string,
): Promise<FeatureTemplateOption[]> {
  const templateRoot = join(piRoot, "feature-templates");
  try {
    const entries = await readdir(templateRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({ label: entry.name, fileName: entry.name }))
      .sort((left, right) => left.label.localeCompare(right.label));
  } catch (error) {
    if (isMissingDirectoryError(error)) return [];
    throw error;
  }
}

export async function loadSelectedFeatureTemplate(
  piRoot: string,
  selected: FeatureTemplateOption | undefined,
  defaultTemplate: string,
): Promise<SelectedFeatureTemplate> {
  if (!selected?.fileName) {
    return { label: defaultFeatureTemplateLabel, content: defaultTemplate, source: "default" };
  }

  const content = await readFile(join(piRoot, "feature-templates", selected.fileName), "utf8");
  return { label: selected.label, fileName: selected.fileName, content, source: "custom" };
}

function isMissingDirectoryError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
