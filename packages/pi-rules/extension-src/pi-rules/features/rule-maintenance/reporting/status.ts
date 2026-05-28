import * as path from "node:path";
import type { HierRulesConfig } from "@app/config";
import { maintainerLogPath } from "@features/rule-maintenance/paths";
import { readMaintainerQueue } from "@features/rule-maintenance/state/queue";
import {
  activeRunAgeMs,
  isActiveRunSuspicious,
  readActiveMaintainerRuns,
} from "@features/rule-maintenance/state/active-runs";
import { readMaintainerLock } from "@features/rule-maintenance/state/lock";
import { isProcessAlive } from "@features/rule-maintenance/runtime/process";
import { tailMaintenanceLog } from "@features/rule-maintenance/state/log";

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "unknown";
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatPathList(paths: string[]): string {
  return paths.length ? paths.join(", ") : "unknown";
}

export function formatMaintainerStatus(cwd: string, config: HierRulesConfig): string {
  const active = readActiveMaintainerRuns(cwd);
  const legacyLock = active.length === 0 ? readMaintainerLock(cwd) : undefined;
  const pending = readMaintainerQueue(cwd);
  const lines = ["Hier-rules maintainer status"];
  lines.push(`- Active runs: ${active.length}`);
  active.forEach((run, index) => {
    const alive = isProcessAlive(run.pid);
    const stale = isActiveRunSuspicious(run, config);
    lines.push(
      `  ${index + 1}. ${run.id}: ${alive ? (stale ? "stale/suspicious" : "running") : "stale"}`,
    );
    lines.push(
      `     PID: ${run.pid ?? "unknown"}; started: ${run.startedAt}; age: ${formatDuration(activeRunAgeMs(run))}`,
    );
    lines.push(`     Reason: ${run.reason}`);
    lines.push(`     Changed files: ${formatPathList(run.changedFiles)}`);
    lines.push(`     Protected rules: ${formatPathList(run.protectedRulePaths)}`);
  });
  if (legacyLock) {
    const alive = isProcessAlive(legacyLock.pid);
    lines.push(`- Legacy lock: ${alive ? "running" : "stale"}`);
    lines.push(`- PID: ${legacyLock.pid ?? "unknown"}`);
    lines.push(`- Started: ${legacyLock.startedAt}`);
    if (legacyLock.reason) lines.push(`- Reason: ${legacyLock.reason}`);
    if (legacyLock.changedFiles?.length)
      lines.push(`- Files: ${legacyLock.changedFiles.join(", ")}`);
  }
  lines.push(`- Max concurrent runs: ${config.maintainer.maxConcurrentRuns ?? 2}`);
  lines.push(`- Pending queued batches: ${pending.length}`);
  pending.slice(0, 5).forEach((batch, index) => {
    lines.push(`  ${index + 1}. ${batch.reason}: ${batch.changedFiles.join(", ")}`);
    if (batch.protectedRulePaths?.length)
      lines.push(`     Protected rules: ${batch.protectedRulePaths.join(", ")}`);
  });
  lines.push(`- Log: ${path.relative(cwd, maintainerLogPath(cwd)).replace(/\\/g, "/")}`);
  return lines.join("\n");
}

export { tailMaintenanceLog };
