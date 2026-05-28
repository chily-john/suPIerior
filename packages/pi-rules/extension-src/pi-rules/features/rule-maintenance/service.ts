import * as fs from "node:fs";
import type { HierRulesConfig } from "@app/config";
import type {
  MaintainerActiveRun,
  MaintainerCallbacks,
  MaintainerPathChangeMetadata,
  MaintainerQueueBatch,
} from "@features/rule-maintenance/model";
import { maintainerLockPath } from "@features/rule-maintenance/paths";
import {
  protectedRulePathsForBatch,
  protectedRulePathsOverlap,
} from "@features/rule-maintenance/protected-paths";
import {
  formatMaintainerStatus,
  tailMaintenanceLog,
} from "@features/rule-maintenance/reporting/status";
import { killProcessTree } from "@features/rule-maintenance/runtime/process";
import { runMaintainerBatch } from "@features/rule-maintenance/runtime/runner";
import { appendMaintainerLog } from "@features/rule-maintenance/state/log";
import { isMaintainerLocked, readMaintainerLock } from "@features/rule-maintenance/state/lock";
import {
  addActiveMaintainerRun,
  pruneDeadActiveRuns,
  readActiveMaintainerRuns,
  removeActiveMaintainerRun,
  updateActiveMaintainerRun,
  writeActiveMaintainerRuns,
} from "@features/rule-maintenance/state/active-runs";
import {
  enqueueMaintainerBatch,
  readMaintainerQueue,
  writeMaintainerQueue,
} from "@features/rule-maintenance/state/queue";

function maintainerFiles(changedFiles: string[]): string[] {
  return [...new Set(changedFiles)].filter((file) => !file.startsWith(".pi/"));
}

function createRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function batchProtectedRulePaths(cwd: string, batch: MaintainerQueueBatch): string[] {
  return batch.protectedRulePaths?.length
    ? batch.protectedRulePaths
    : protectedRulePathsForBatch(cwd, batch.changedFiles);
}

function conflictsWithActive(
  batchProtectedRulePaths: string[],
  active: MaintainerActiveRun[],
): boolean {
  return active.some((run) =>
    protectedRulePathsOverlap(batchProtectedRulePaths, run.protectedRulePaths),
  );
}

function startScheduledBatch(
  cwd: string,
  batch: MaintainerQueueBatch,
  protectedRulePaths: string[],
  reasonPrefix: string | undefined,
  config: HierRulesConfig,
  callbacks: MaintainerCallbacks,
): boolean {
  const reason = reasonPrefix ? `${reasonPrefix}:${batch.reason}` : batch.reason;
  const run: MaintainerActiveRun = {
    id: createRunId(),
    startedAt: new Date().toISOString(),
    reason,
    changedFiles: batch.changedFiles,
    protectedRulePaths,
  };
  addActiveMaintainerRun(cwd, run);
  appendMaintainerLog(
    cwd,
    `Starting maintainer run ${run.id} (${reason}) protecting ${protectedRulePaths.join(", ")} at ${run.startedAt}.`,
  );
  const started = runMaintainerBatch({
    cwd,
    changedFiles: batch.changedFiles,
    ...(batch.deletedFiles?.length ? { deletedFiles: batch.deletedFiles } : {}),
    ...(batch.renamedFiles?.length ? { renamedFiles: batch.renamedFiles } : {}),
    reason,
    config,
    runId: run.id,
    protectedRulePaths,
    callbacks,
    onPid: (pid) => updateActiveMaintainerRun(cwd, run.id, { pid }),
    onFinalize: () => {
      removeActiveMaintainerRun(cwd, run.id);
      drainMaintainerQueue(cwd, config, callbacks, "queued");
    },
  });
  if (!started) removeActiveMaintainerRun(cwd, run.id);
  return started;
}

export function drainMaintainerQueue(
  cwd: string,
  config: HierRulesConfig,
  callbacks: MaintainerCallbacks = {},
  reasonPrefix?: string,
): number {
  if (isMaintainerLocked(cwd, config)) return 0;
  const maxConcurrentRuns = Math.max(1, config.maintainer.maxConcurrentRuns ?? 2);
  let active = pruneDeadActiveRuns(cwd);
  let pending = readMaintainerQueue(cwd);
  let startedCount = 0;
  let madeProgress = true;

  while (madeProgress && active.length < maxConcurrentRuns) {
    madeProgress = false;
    for (let index = 0; index < pending.length && active.length < maxConcurrentRuns; index += 1) {
      const batch = pending[index];
      const protectedRulePaths = batchProtectedRulePaths(cwd, batch);
      pending[index] = { ...batch, protectedRulePaths };
      if (conflictsWithActive(protectedRulePaths, active)) continue;

      pending.splice(index, 1);
      writeMaintainerQueue(cwd, pending);
      if (startScheduledBatch(cwd, batch, protectedRulePaths, reasonPrefix, config, callbacks)) {
        startedCount += 1;
        active = readActiveMaintainerRuns(cwd);
        madeProgress = true;
      } else {
        pending.push({
          ...batch,
          protectedRulePaths,
          queuedAt: new Date().toISOString(),
          reason: `retry:${batch.reason}`,
        });
        writeMaintainerQueue(cwd, pending);
      }
      break;
    }
  }
  writeMaintainerQueue(cwd, pending);
  return startedCount;
}

export function startMaintenance(
  cwd: string,
  changedFiles: string[],
  reason: string,
  config: HierRulesConfig,
  callbacks: MaintainerCallbacks = {},
  metadata: MaintainerPathChangeMetadata = {},
): boolean {
  const uniqueChangedFiles = maintainerFiles(changedFiles);
  if (uniqueChangedFiles.length === 0) return false;
  const changedFileSet = new Set(uniqueChangedFiles);
  const filteredMetadata: MaintainerPathChangeMetadata = {};
  const deletedFiles = metadata.deletedFiles?.filter((file) => changedFileSet.has(file));
  const renamedFiles = metadata.renamedFiles?.filter(
    (rename) => changedFileSet.has(rename.fromPath) || changedFileSet.has(rename.toPath),
  );
  if (deletedFiles?.length) filteredMetadata.deletedFiles = deletedFiles;
  if (renamedFiles?.length) filteredMetadata.renamedFiles = renamedFiles;

  const protectedRulePaths = protectedRulePathsForBatch(cwd, uniqueChangedFiles);
  const queueSize = enqueueMaintainerBatch(
    cwd,
    uniqueChangedFiles,
    reason,
    protectedRulePaths,
    filteredMetadata,
  );
  const startedCount = drainMaintainerQueue(cwd, config, callbacks);
  if (startedCount === 0) callbacks.onQueued?.(queueSize);
  return startedCount > 0;
}

export function startNextQueuedMaintenance(
  cwd: string,
  reasonPrefix: string,
  config: HierRulesConfig,
  callbacks: MaintainerCallbacks = {},
): boolean {
  const startedCount = drainMaintainerQueue(cwd, config, callbacks, reasonPrefix);
  if (startedCount > 0)
    appendMaintainerLog(
      cwd,
      `Started ${startedCount} queued maintainer batch(es) (${reasonPrefix}) at ${new Date().toISOString()}.`,
    );
  return startedCount > 0;
}

export function terminateMaintainer(cwd: string): string {
  const active = readActiveMaintainerRuns(cwd);
  let killed = 0;
  for (const run of active) {
    if (!run.pid) continue;
    if (run.pid === process.pid) continue;
    try {
      killProcessTree(run.pid);
      killed += 1;
    } catch {
      /* best-effort emergency stop */
    }
  }
  if (active.length > 0) {
    writeActiveMaintainerRuns(cwd, []);
    appendMaintainerLog(
      cwd,
      `Terminated ${killed} active maintainer process(es) and cleared active runs at ${new Date().toISOString()}.`,
    );
    return `Terminated ${killed} active maintainer process(es) and cleared ${active.length} active run(s).`;
  }

  const lock = readMaintainerLock(cwd);
  if (!lock?.pid) {
    fs.rmSync(maintainerLockPath(cwd), { force: true });
    appendMaintainerLog(
      cwd,
      `Maintainer kill requested at ${new Date().toISOString()}; no PID found, cleared stale lock if present.`,
    );
    return "No maintainer PID found; cleared stale lock if present.";
  }
  if (lock.pid === process.pid) {
    fs.rmSync(maintainerLockPath(cwd), { force: true });
    appendMaintainerLog(
      cwd,
      `Maintainer kill requested at ${new Date().toISOString()}; lock pointed at current Pi PID ${lock.pid}, cleared without killing.`,
    );
    return "Lock pointed at the current Pi process, likely from an older plugin version; cleared lock without killing anything.";
  }
  try {
    killProcessTree(lock.pid);
  } finally {
    fs.rmSync(maintainerLockPath(cwd), { force: true });
    appendMaintainerLog(
      cwd,
      `Terminated legacy maintainer process ${lock.pid} and cleared lock at ${new Date().toISOString()}.`,
    );
  }
  return `Terminated legacy maintainer process ${lock.pid} and cleared lock.`;
}

export { appendMaintainerLog, formatMaintainerStatus, tailMaintenanceLog };
