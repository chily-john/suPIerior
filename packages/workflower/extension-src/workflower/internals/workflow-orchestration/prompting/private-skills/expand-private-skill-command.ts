import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findPrivateSkill } from "@orchestration/runtime/private-skills/private-skill-registry";
import { stripLeadingSkillFrontmatter } from "@orchestration/runtime/private-skills/skill-markdown";

const privateSkillCommandPrefix = "/skill:";

export function expandPrivateSkillCommand(command: string): string | undefined {
  if (!command.startsWith(privateSkillCommandPrefix)) return undefined;

  const parsed = parsePrivateSkillCommand(command);
  if (parsed === undefined) return undefined;

  const skill = findPrivateSkill(parsed.name);
  if (skill === undefined) return undefined;

  const skillFilePath = resolve(skill.filePath);
  const skillBaseDir = resolve(skill.baseDir);
  const skillBody = stripLeadingSkillFrontmatter(readFileSync(skillFilePath, "utf8")).trimEnd();
  const lines = [
    `<skill name="${escapeXmlAttribute(skill.name)}" location="${escapeXmlAttribute(skillFilePath)}">`,
    `References are relative to ${skillBaseDir}.`,
    "",
    skillBody,
    "</skill>",
  ];

  if (parsed.args !== "") {
    lines.push("", parsed.args);
  }

  return lines.join("\n");
}

type ParsedPrivateSkillCommand = {
  name: string;
  args: string;
};

function parsePrivateSkillCommand(command: string): ParsedPrivateSkillCommand | undefined {
  const commandBody = command.slice(privateSkillCommandPrefix.length);
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(commandBody);
  if (match === null) return undefined;

  return {
    name: match[1],
    args: match[2]?.trim() ?? "",
  };
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
