import { normalizeText } from "@shared/text";

export function hasCodeEditIntent(prompt: string, hasExplicitPathMatch: boolean): boolean {
  if (hasExplicitPathMatch) return true;
  const text = normalizeText(prompt);
  const editVerbs = [
    "add",
    "build",
    "change",
    "create",
    "delete",
    "edit",
    "implement",
    "make",
    "modify",
    "move",
    "refactor",
    "remove",
    "rename",
    "review",
    "update",
    "write",
  ];
  const codeNouns = [
    "api",
    "class",
    "component",
    "file",
    "function",
    "hook",
    "module",
    "page",
    "provider",
    "route",
    "service",
    "test",
    "type",
    "util",
    "utility",
  ];
  return (
    editVerbs.some((verb) => text.includes(verb)) && codeNouns.some((noun) => text.includes(noun))
  );
}
