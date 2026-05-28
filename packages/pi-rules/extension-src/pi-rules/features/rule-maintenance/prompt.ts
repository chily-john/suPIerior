import type { MaintainerPathChangeMetadata } from "@features/rule-maintenance/model";

export function buildMaintainerPrompt(
  changedFiles: string[],
  reason: string,
  protectedRulePaths: string[] = [],
  metadata: MaintainerPathChangeMetadata = {},
): string {
  const deletedSection = metadata.deletedFiles?.length
    ? `\n\nDeleted source paths detected during that turn (these may no longer exist):\n${metadata.deletedFiles.map((file) => `- ${file}`).join("\n")}`
    : "";
  const renamedSection = metadata.renamedFiles?.length
    ? `\n\nRenamed source paths detected during that turn:\n${metadata.renamedFiles.map((rename) => `- ${rename.fromPath} -> ${rename.toPath}`).join("\n")}`
    : "";
  const protectedSection =
    protectedRulePaths.length > 0
      ? `\n\nReserved .pi/rules files/scopes for this maintenance run:\n${protectedRulePaths.map((file) => `- ${file}`).join("\n")}\nOnly update these reserved .pi/rules files/scopes. If another .pi/rules file needs updates, report that need in the final response instead of editing it.`
      : "";
  return `/skill:rules-maintainer Reason: ${reason}\n\nSource paths changed, created, deleted, or renamed in the completed main-agent turn (some listed paths may no longer exist):\n${changedFiles.map((file) => `- ${file}`).join("\n")}${deletedSection}${renamedSection}${protectedSection}\n\nRun as a background maintenance pass. Do not make unrelated source changes. Update only matching .pi/rules inventory/rules files when the change is significant according to the skill instructions.`;
}
