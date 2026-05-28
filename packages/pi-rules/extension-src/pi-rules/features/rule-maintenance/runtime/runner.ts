import * as fs from "node:fs";
import { spawn } from "node:child_process";
import type { HierRulesConfig } from "@app/config";
import type {
  MaintainerCallbacks,
  MaintainerPathChangeMetadata,
} from "@features/rule-maintenance/model";
import { maintainerSkillPath } from "@features/rule-maintenance/paths";
import { buildMaintainerPrompt } from "@features/rule-maintenance/prompt";
import { appendMaintainerRunHeader } from "@features/rule-maintenance/state/log";
import { getPiSpawnSpec, killProcessTree } from "@features/rule-maintenance/runtime/process";
import { parseMaintainerOutputLine } from "@features/rule-maintenance/runtime/output";

export type RunMaintainerBatchOptions = MaintainerPathChangeMetadata & {
  cwd: string;
  changedFiles: string[];
  reason: string;
  config: HierRulesConfig;
  runId: string;
  protectedRulePaths: string[];
  callbacks: MaintainerCallbacks;
  onPid: (pid: number) => void;
  onFinalize: () => void;
};

export function runMaintainerBatch(options: RunMaintainerBatchOptions): boolean {
  const { cwd, changedFiles, reason, config, callbacks } = options;
  void config;
  const logPath = appendMaintainerRunHeader(cwd, reason, changedFiles);
  const piSpawn = getPiSpawnSpec();
  if (!piSpawn) {
    fs.appendFileSync(
      logPath,
      "Maintainer failed to start: could not resolve a non-shell Pi CLI entrypoint. Reinstall or launch Pi through its Node CLI script.\n",
    );
    callbacks.onFinished?.({
      ok: false,
      code: null,
      error: "could not resolve a non-shell Pi CLI entrypoint",
      logPath,
    });
    options.onFinalize();
    return false;
  }

  const args = [
    ...piSpawn.prefixArgs,
    "--print",
    "--mode",
    "json",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--skill",
    maintainerSkillPath(),
    "--no-context-files",
    "--tools",
    "read,edit,bash",
    buildMaintainerPrompt(changedFiles, reason, options.protectedRulePaths, options),
  ];
  fs.appendFileSync(
    logPath,
    `Spawn: ${piSpawn.command} ${piSpawn.prefixArgs.join(" ")} --mode json\n`,
  );
  const child = spawn(piSpawn.command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: piSpawn.shell,
  });
  if (child.pid) {
    options.onPid(child.pid);
    fs.appendFileSync(
      logPath,
      `Started run ${options.runId} PID: ${child.pid} at ${new Date().toISOString()}\n`,
    );
  }
  callbacks.onStarted?.();

  let finalized = false;
  const killChildOnParentExit = () => {
    if (finalized || !child.pid) return;
    try {
      killProcessTree(child.pid);
    } catch {
      /* best-effort session ownership cleanup */
    }
    try {
      fs.appendFileSync(
        logPath,
        `Parent Pi process exited; sent termination to maintainer PID ${child.pid} at ${new Date().toISOString()}.\n`,
      );
    } catch {
      /* ignore shutdown logging errors */
    }
  };
  process.once("exit", killChildOnParentExit);

  const finalize = (code: number | null, error?: Error, source = "process") => {
    if (finalized) return;
    finalized = true;
    process.off("exit", killChildOnParentExit);
    const finishedAt = new Date().toISOString();
    if (error)
      fs.appendFileSync(
        logPath,
        `\nMaintainer failed at ${finishedAt} via ${source}: ${error.message}\n`,
      );
    else
      fs.appendFileSync(
        logPath,
        `\nMaintainer completed at ${finishedAt} via ${source} with exit code ${code ?? "unknown"}.\n`,
      );
    if ((source === "final_message" || source === "agent_end") && child.pid) {
      try {
        killProcessTree(child.pid);
      } catch {
        /* child may have exited normally */
      }
    }
    callbacks.onFinished?.({ ok: !error && code === 0, code, error: error?.message, logPath });
    options.onFinalize();
  };

  let stdoutBuffer = "";
  const handleStdoutLine = (line: string) => {
    if (finalized) return;
    const event = parseMaintainerOutputLine(line, logPath);
    if (event?.kind === "complete") finalize(0, undefined, event.source);
  };
  child.stdout?.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) handleStdoutLine(line);
  });
  child.stderr?.on("data", (chunk) => fs.appendFileSync(logPath, chunk.toString()));
  child.once("spawn", () =>
    fs.appendFileSync(logPath, `Child spawn event at ${new Date().toISOString()}.\n`),
  );
  child.once("error", (error) => finalize(null, error, "error"));
  child.once("exit", (code) => {
    fs.appendFileSync(
      logPath,
      `Child exit event at ${new Date().toISOString()} with code ${code ?? "unknown"}.\n`,
    );
    finalize(code, undefined, "exit");
  });
  child.once("close", (code) => {
    if (stdoutBuffer.trim()) handleStdoutLine(stdoutBuffer);
    fs.appendFileSync(
      logPath,
      `Child close event at ${new Date().toISOString()} with code ${code ?? "unknown"}.\n`,
    );
    finalize(code, undefined, "close");
  });
  return true;
}
