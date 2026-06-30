import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readConfig,
  resetConfigCache,
  ensureMetricsDir,
  appendStepMetrics,
} from "./step-metrics-store";
import { promises as fs } from "fs";
import { resolve, sep } from "path";
import type { WorkflowerConfig, StepMetrics } from "./step-metrics.types";

describe("readConfig", () => {
  const testWorkflowerRoot = "/tmp/test-workflower";
  const configPath = resolve(testWorkflowerRoot, "config.json");

  beforeEach(async () => {
    resetConfigCache();
    vi.restoreAllMocks();
  });

  it("should return default config when file does not exist", async () => {
    const config = await readConfig(testWorkflowerRoot);
    expect(config.metricsEnabled).toBe(true);
  });

  it("should return parsed config when file exists and is valid JSON", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(JSON.stringify({ metricsEnabled: true }));

    const config = await readConfig(testWorkflowerRoot);
    expect(config.metricsEnabled).toBe(true);
  });

  it("should return default config when file is corrupted JSON", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValueOnce("invalid json");

    const config = await readConfig(testWorkflowerRoot);
    expect(config.metricsEnabled).toBe(true);
  });

  it("should return default config when file has invalid schema", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValueOnce(
      JSON.stringify({ metricsEnabled: "not-a-boolean" }),
    );

    const config = await readConfig(testWorkflowerRoot);
    expect(config.metricsEnabled).toBe(true);
  });

  it("should cache the config after first read", async () => {
    const mockReadFile = vi
      .spyOn(fs, "readFile")
      .mockResolvedValue(JSON.stringify({ metricsEnabled: true }));

    const config1 = await readConfig(testWorkflowerRoot);
    const config2 = await readConfig(testWorkflowerRoot);

    expect(config1.metricsEnabled).toBe(true);
    expect(config2.metricsEnabled).toBe(true);
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });
});

describe("appendStepMetrics", () => {
  const testFlowerPath = "/tmp/test-workflower/workflows/test-garden/test-flower/index.json";
  const expectedMetricsDir = resolve(
    "/tmp/test-workflower/.workflower/past-runs-data/test-garden/test-flower",
  );
  const expectedMetricsFile = resolve(expectedMetricsDir, "metrics.json");

  const sampleStepMetrics: StepMetrics = {
    stepIndex: 0,
    stepId: "test-step",
    startedAt: "2024-01-01T00:00:00.000Z",
    completedAt: "2024-01-01T00:00:01.000Z",
    durationMs: 1000,
    inputTokens: 100,
    outputTokens: 50,
    model: { provider: "test", id: "test-model", api: "test-api" },
    thinkingLevel: "default",
    errorCount: 0,
    lastErrorMessage: null,
    toolCallCount: 0,
    toolNames: [],
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    vi.spyOn(fs, "rename").mockResolvedValue(undefined);
    vi.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));
  });

  it("should create directory and file when nothing exists", async () => {
    await appendStepMetrics(testFlowerPath, sampleStepMetrics);

    expect(fs.mkdir).toHaveBeenCalledWith(expectedMetricsDir, { recursive: true });
    expect(fs.writeFile).toHaveBeenCalled();
    expect(fs.rename).toHaveBeenCalled();
  });

  it("should create metrics.json with single element when file does not exist", async () => {
    vi.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

    await appendStepMetrics(testFlowerPath, sampleStepMetrics);

    expect(fs.writeFile).toHaveBeenCalled();
    const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenContent = JSON.parse(writeFileCall[1]);
    expect(Array.isArray(writtenContent)).toBe(true);
    expect(writtenContent).toHaveLength(1);
    expect(writtenContent[0]).toEqual(sampleStepMetrics);
  });

  it("should append to existing metrics.json array", async () => {
    const existingMetrics = [sampleStepMetrics];
    vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify(existingMetrics));

    const newStepMetrics: StepMetrics = {
      ...sampleStepMetrics,
      stepIndex: 1,
      stepId: "test-step-2",
    };

    await appendStepMetrics(testFlowerPath, newStepMetrics);

    const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenContent = JSON.parse(writeFileCall[1]);
    expect(Array.isArray(writtenContent)).toBe(true);
    expect(writtenContent).toHaveLength(2);
    expect(writtenContent[0]).toEqual(sampleStepMetrics);
    expect(writtenContent[1]).toEqual(newStepMetrics);
  });

  it("should handle corrupted metrics.json and start fresh", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("invalid json");

    await appendStepMetrics(testFlowerPath, sampleStepMetrics);

    const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenContent = JSON.parse(writeFileCall[1]);
    expect(Array.isArray(writtenContent)).toBe(true);
    expect(writtenContent).toHaveLength(1);
    expect(writtenContent[0]).toEqual(sampleStepMetrics);
  });

  it("should handle non-array metrics.json and start fresh", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify({ foo: "bar" }));

    await appendStepMetrics(testFlowerPath, sampleStepMetrics);

    const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const writtenContent = JSON.parse(writeFileCall[1]);
    expect(Array.isArray(writtenContent)).toBe(true);
    expect(writtenContent).toHaveLength(1);
    expect(writtenContent[0]).toEqual(sampleStepMetrics);
  });

  it("should use atomic write pattern", async () => {
    vi.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

    await appendStepMetrics(testFlowerPath, sampleStepMetrics);

    const writeFileCall = (fs.writeFile as jest.Mock).mock.calls[0];
    const tempFile = writeFileCall[0];
    expect(tempFile).toContain(".tmp.");
    expect(tempFile).toContain("metrics.json");

    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining(".tmp."),
      expect.stringContaining("metrics.json"),
    );
  });
});
