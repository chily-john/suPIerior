export type ParsedResumeArgs =
  | { ok: true; gardenName: string; stepOverride?: string }
  | { ok: false; message: string };

export const WF_RESUME_USAGE = "Usage: /wf resume <garden-name> [--step <step-index-or-id>]";

export function parseResumeArgs(args: string): ParsedResumeArgs {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { ok: true, gardenName: parts[0] };
  }

  if (parts.length === 3 && parts[1] === "--step") {
    return { ok: true, gardenName: parts[0], stepOverride: parts[2] };
  }

  return { ok: false, message: WF_RESUME_USAGE };
}
