import { join } from "node:path";

export function renderOutputPaths(workdir: string, outputs: string[]): string {
  return outputs.length > 0
    ? outputs.map((output) => `- ${join(workdir, output)}`).join("\n")
    : "- None declared";
}
