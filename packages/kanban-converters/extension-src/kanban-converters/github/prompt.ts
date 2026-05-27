export function renderGithubIssuesPrompt(featureMarkdown: string): string {
  return `Convert the feature plan below into a reviewable issues.md file for GitHub-backed work items.

Use this exact output format:

# Issues for <feature title>

---
title: "Short issue title"
type: AFK
labels: []
blockedBy: []
---

## What to build
A concise description of the vertical slice.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by
None - can start immediately

Repeat the frontmatter/body block for each work item.

Rules:
- Output only the issues.md Markdown content. Do not wrap it in a code fence.
- Break the feature into tracer-bullet vertical slices.
- Each slice must deliver a narrow but complete path through the relevant integration layers.
- Each completed slice should be demoable or verifiable on its own.
- Prefer many thin slices over a few broad slices.
- Prefer AFK over HITL where possible.
- Mark slices as HITL only when human interaction, architectural decision, external credentialing, or design review is required.
- Capture dependencies in blockedBy using issue titles during draft generation.
- Include covered user stories in the body when the source material makes them clear.
- Do not add labels unless the source material explicitly calls for them.

Feature plan:

${featureMarkdown.trim()}
`;
}

export function stripMarkdownFence(markdown: string): string {
  const trimmed = markdown.trim();
  const fence = /^```(?:md|markdown)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return `${(fence?.[1] ?? trimmed).trim()}\n`;
}
