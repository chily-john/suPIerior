import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

export type PiSpawnSpec = { command: string; prefixArgs: string[]; shell: boolean };

export function isProcessAlive(pid: number | undefined): boolean {
	if (!pid) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function killProcessTree(pid: number): void {
	if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
	else process.kill(pid, "SIGTERM");
}

function resolveJsCliFromShim(shimPath: string): string | undefined {
	if (!fs.existsSync(shimPath)) return undefined;
	const shimDir = path.dirname(shimPath);
	const content = fs.readFileSync(shimPath, "utf8");
	const shimPrefix = `${shimDir}${path.sep}`;
	const quotedCandidates = [...content.matchAll(/["']([^"']+\.(?:cjs|js|mjs))["']/gi)].map((match) => match[1]);
	const tokenCandidates = [...content.matchAll(/([^"'\s]+\.(?:cjs|js|mjs))/gi)].map((match) => match[1]);
	const candidates = [...quotedCandidates, ...tokenCandidates].filter((candidate) => /[\\/]/.test(candidate));
	for (const rawCandidate of candidates) {
		const candidate = rawCandidate
			.replace(/%~dp0[\\/]?/gi, shimPrefix)
			.replace(/%dp0%[\\/]?/gi, shimPrefix);
		const resolved = path.resolve(candidate);
		if (fs.existsSync(resolved)) return resolved;
	}
	return undefined;
}

export function getPiSpawnSpec(): PiSpawnSpec | undefined {
	const cliPath = process.argv[1];
	if (cliPath && fs.existsSync(cliPath)) {
		if (/\.(cjs|js|mjs)$/i.test(cliPath)) return { command: process.execPath, prefixArgs: [cliPath], shell: false };
		if (process.platform === "win32" && /\.(cmd|bat)$/i.test(cliPath)) {
			const jsCli = resolveJsCliFromShim(cliPath);
			if (jsCli) return { command: process.execPath, prefixArgs: [jsCli], shell: false };
		}
	}
	if (process.platform === "win32") return undefined;
	return { command: "pi", prefixArgs: [], shell: false };
}
