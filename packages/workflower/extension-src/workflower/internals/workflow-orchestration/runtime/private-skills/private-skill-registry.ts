export type WorkflowerPrivateSkill = {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
};

export type WorkflowerPrivateSkillDiagnostic = {
  level: "warning" | "error";
  message: string;
  path?: string;
};

type PrivateSkillRegistry = {
  skillByName: Map<string, WorkflowerPrivateSkill>;
};

type PrivateSkillRegistryGlobal = typeof globalThis & {
  __supieriorWorkflowerPrivateSkillRegistry?: PrivateSkillRegistry;
};

const registryGlobal = globalThis as PrivateSkillRegistryGlobal;
const registry = (registryGlobal.__supieriorWorkflowerPrivateSkillRegistry ??= {
  skillByName: new Map<string, WorkflowerPrivateSkill>(),
});

export function registerPrivateSkill(
  skill: WorkflowerPrivateSkill,
): WorkflowerPrivateSkillDiagnostic | undefined {
  const existingSkill = registry.skillByName.get(skill.name);
  if (existingSkill === undefined) {
    registry.skillByName.set(skill.name, skill);
    return undefined;
  }

  if (existingSkill.filePath === skill.filePath) return undefined;

  return {
    level: "warning",
    message: `Private skill name already registered: ${skill.name}`,
    path: skill.filePath,
  };
}

export function registerPrivateSkills(
  skills: WorkflowerPrivateSkill[],
): WorkflowerPrivateSkillDiagnostic[] {
  return skills.flatMap((skill) => {
    const diagnostic = registerPrivateSkill(skill);
    return diagnostic === undefined ? [] : [diagnostic];
  });
}

export function findPrivateSkill(name: string): WorkflowerPrivateSkill | undefined {
  return registry.skillByName.get(name);
}

export function listPrivateSkills(): WorkflowerPrivateSkill[] {
  return [...registry.skillByName.values()];
}

export function clearPrivateSkillsForTests(): void {
  registry.skillByName.clear();
}
