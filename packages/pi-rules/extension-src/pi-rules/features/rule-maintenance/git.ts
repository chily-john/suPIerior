import { spawnSync } from "node:child_process";
import { normalizeProjectPath } from "@shared/paths";
import {
  addChangedPath,
  addDeletedPath,
  addRenamedPath,
  createTurnFileActivity,
  type TurnFileActivity,
} from "@features/rule-maintenance/turn-activity";

export type GitStatusSnapshot = {
  files: Set<string>;
  activity: TurnFileActivity;
};

function addGitPath(files: Set<string>, filePath: string | undefined) {
  if (filePath) files.add(filePath);
}

function normalizeGitStatusPath(cwd: string, rawPath: string | undefined): string | undefined {
  return rawPath ? normalizeProjectPath(cwd, rawPath.trim()) : undefined;
}

function parseRenamePath(rawPath: string): { fromPath: string; toPath: string } | undefined {
  const separator = " -> ";
  const separatorIndex = rawPath.indexOf(separator);
  if (separatorIndex === -1) return undefined;
  const fromPath = rawPath.slice(0, separatorIndex).trim();
  const toPath = rawPath.slice(separatorIndex + separator.length).trim();
  return fromPath && toPath ? { fromPath, toPath } : undefined;
}

export function parseGitStatusPorcelain(cwd: string, stdout: string): GitStatusSnapshot {
  const activity = createTurnFileActivity();
  const files = new Set<string>();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    const rawPath = line.slice(3);
    const metadata = { source: "git-status" as const };
    if (status.includes("R")) {
      const rename = parseRenamePath(rawPath);
      if (!rename) continue;
      const fromPath = normalizeGitStatusPath(cwd, rename.fromPath);
      const toPath = normalizeGitStatusPath(cwd, rename.toPath);
      addGitPath(files, fromPath);
      addGitPath(files, toPath);
      if (fromPath && toPath) addRenamedPath(activity, fromPath, toPath, metadata);
      else if (fromPath) addDeletedPath(activity, fromPath, metadata);
      else if (toPath) addChangedPath(activity, toPath, metadata);
      continue;
    }
    const normalized = normalizeGitStatusPath(cwd, rawPath);
    addGitPath(files, normalized);
    if (!normalized) continue;
    if (status.includes("D")) addDeletedPath(activity, normalized, metadata);
    else addChangedPath(activity, normalized, metadata);
  }
  return { files, activity };
}

export function getGitStatusSnapshot(cwd: string): GitStatusSnapshot {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return { files: new Set<string>(), activity: createTurnFileActivity() };
  return parseGitStatusPorcelain(cwd, result.stdout);
}

export function getGitStatusFiles(cwd: string): Set<string> {
  return getGitStatusSnapshot(cwd).files;
}

function activityKeys(snapshot: GitStatusSnapshot | Set<string>): Set<string> {
  if (snapshot instanceof Set) return new Set([...snapshot].map((filePath) => `file:${filePath}`));
  const keys = new Set<string>();
  for (const filePath of snapshot.activity.changed.keys()) keys.add(`changed:${filePath}`);
  for (const filePath of snapshot.activity.deleted.keys()) keys.add(`deleted:${filePath}`);
  for (const rename of snapshot.activity.renamed.values())
    keys.add(`renamed:${rename.fromPath}\u0000${rename.toPath}`);
  return keys;
}

function hasBaselineActivity(
  start: GitStatusSnapshot | Set<string>,
  baselineKeys: Set<string>,
  kind: "changed" | "deleted" | "renamed",
  filePath: string,
): boolean {
  if (!(start instanceof Set)) return baselineKeys.has(`${kind}:${filePath}`);
  return start.has(filePath);
}

export function getGitStatusActivitySince(
  cwd: string,
  start: GitStatusSnapshot | Set<string>,
): TurnFileActivity {
  const snapshot = getGitStatusSnapshot(cwd);
  const baselineKeys = activityKeys(start);
  const activity = createTurnFileActivity();
  for (const [filePath, metadata] of snapshot.activity.changed) {
    if (!hasBaselineActivity(start, baselineKeys, "changed", filePath))
      addChangedPath(activity, filePath, metadata);
  }
  for (const [filePath, metadata] of snapshot.activity.deleted) {
    if (!hasBaselineActivity(start, baselineKeys, "deleted", filePath))
      addDeletedPath(activity, filePath, metadata);
  }
  for (const rename of snapshot.activity.renamed.values()) {
    const renameKey = `renamed:${rename.fromPath}\u0000${rename.toPath}`;
    if (!baselineKeys.has(renameKey))
      addRenamedPath(activity, rename.fromPath, rename.toPath, rename.metadata);
  }
  return activity;
}
