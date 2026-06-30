import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleConfigCommand } from "./config";
import type { ConfigCommandContext } from "./config";

type NotifyCall = [message: string, level?: "info" | "warning" | "error"];

type UiMock = {
  notify: (message: string, level?: "info" | "warning" | "error") => void;
  select: (prompt: string, options: string[]) => Promise<string | undefined>;
  input: (prompt: string, placeholder?: string) => Promise<string | undefined>;
  confirm: (title: string, message: string) => Promise<boolean>;
  setStatus?: (key: string, text: string | undefined) => void;
};

describe("config command", () => {
  let testDir: string;
  let mockCtx: ConfigCommandContext;
  let notifyCalls: NotifyCall[];

  let uiMock: UiMock;

  beforeEach(async () => {
    testDir = join(tmpdir() ?? "/tmp", `workflower-config-test-${Date.now()}`);
    await mkdir(testDir, {
      recursive: true,
    });

    // Create .workflower directory
    await mkdir(join(testDir, ".workflower"), { recursive: true });

    notifyCalls = [];

    uiMock = {
      notify: (message: string, level?: "info" | "warning" | "error") => {
        notifyCalls.push([message, level]);
      },
      select: vi.fn().mockResolvedValue(undefined),
      input: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(false),
    };

    mockCtx = {
      cwd: testDir,
      ui: uiMock,
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("display current configuration", () => {
    it("should display current configuration when config file exists", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const configContent = {
        modelLevels: {
          tiny: ["model-tiny-1"],
          small: ["model-small-1"],
        },
        defaultModel: "tiny",
        fallbackStrategy: "up",
      };
      await writeFile(configPath, JSON.stringify(configContent, null, 2), "utf-8");

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert
      expect(notifyCalls.length).toBeGreaterThan(0);
      const displayMessage = notifyCalls.find((call) => call[1] === "info")?.[0];

      expect(displayMessage).toBeDefined();
      expect(displayMessage).toContain("Current Workflower Configuration");
      expect(displayMessage).toContain("tiny: [model-tiny-1]");
      expect(displayMessage).toContain("small: [model-small-1]");
      expect(displayMessage).toContain("Default Model: tiny");
      expect(displayMessage).toContain("Fallback Strategy: up");
    });

    it("should show empty state when config file does not exist", async () => {
      // Act
      await handleConfigCommand("", mockCtx);

      // Assert
      expect(notifyCalls.length).toBeGreaterThan(0);
      const displayMessage = notifyCalls.find((call) => call[1] === "info")?.[0];

      expect(displayMessage).toBeDefined();
      expect(displayMessage).toContain("No configuration found");
    });
  });

  describe("validation integration", () => {
    it("should use validateConfig from Story 001", async () => {
      // This test verifies that we can use the validateConfig function
      // which was implemented in Story 001
      const { validateConfig } = await import("../model-config");

      const config = {
        modelLevels: {
          tiny: ["model-1"],
        },
        defaultModel: "tiny",
        fallbackStrategy: "up",
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("interactive editing", () => {
    it("should allow editing defaultModel and save", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const initialConfig = {
        modelLevels: {
          tiny: ["model-tiny-1"],
        },
        defaultModel: "model-tiny-1",
        fallbackStrategy: "default",
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Mock user selecting "Edit default model", entering new value, then "Save configuration"
      uiMock.select = vi
        .fn()
        .mockResolvedValueOnce("Edit default model") // First menu selection
        .mockResolvedValueOnce("Save configuration"); // Save after edit
      uiMock.input = vi.fn().mockResolvedValueOnce("new-model"); // New default model value

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert
      // Check that select was called for the main menu
      expect(uiMock.select).toHaveBeenCalled();
      // Check that input was called for defaultModel
      expect(uiMock.input).toHaveBeenCalledWith(
        expect.stringContaining("default model"),
        expect.anything(),
      );
      // Check that save was attempted (notification about save)
      const saveNotifications = notifyCalls.filter(
        (call) => call[0].includes("saved") || call[0].includes("Saved"),
      );
      expect(saveNotifications.length).toBeGreaterThan(0);
    });

    it("should allow editing fallbackStrategy with validation", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const initialConfig = {
        modelLevels: {
          tiny: ["model-tiny-1"],
        },
        defaultModel: "model-tiny-1",
        fallbackStrategy: "default",
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Mock user selecting "Edit fallback strategy", selecting "up", then saving
      uiMock.select = vi
        .fn()
        .mockResolvedValueOnce("Edit fallback strategy") // First menu selection
        .mockResolvedValueOnce("up") // Select "up" from options
        .mockResolvedValueOnce("Back to main menu"); // Return to main menu
      uiMock.confirm = vi.fn().mockResolvedValueOnce(true); // Confirm save

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert
      expect(uiMock.select).toHaveBeenCalledWith(
        expect.stringContaining("fallback strategy"),
        expect.arrayContaining(["up", "down", "default"]),
      );
    });

    it("should create config file if it does not exist when saving", async () => {
      // Arrange - no config file exists
      const configPath = join(testDir, ".workflower", "config.json");

      // Mock user going directly to save
      uiMock.select = vi.fn().mockResolvedValueOnce("Save configuration");
      uiMock.confirm = vi.fn().mockResolvedValueOnce(true); // Confirm save

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert - config file should be created
      await expect(readFile(configPath, "utf-8")).resolves.toBeTruthy();
    });

    it("should show validation errors and not save if invalid", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      // Start with an invalid config - modelLevels with invalid level key
      const initialConfig = {
        modelLevels: {
          invalidLevel: ["model-1"], // This is invalid - not in LEVEL_ORDER
        },
        defaultModel: "model-1",
        fallbackStrategy: "default",
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Mock user going directly to save
      uiMock.select = vi.fn().mockResolvedValueOnce("Save configuration");

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert - should show validation error and not save
      const errorNotifications = notifyCalls.filter((call) => call[1] === "error");
      expect(errorNotifications.length).toBeGreaterThan(0);
      expect(errorNotifications.some((n) => n[0].includes("Validation"))).toBe(true);

      // Verify file was not changed (still has invalid config)
      const savedConfig = JSON.parse(await readFile(configPath, "utf-8"));
      expect(savedConfig.modelLevels.invalidLevel).toBeDefined();
    });

    it("should allow editing model levels - add/remove models", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const initialConfig = {
        modelLevels: {
          tiny: ["model-tiny-1"],
        },
        defaultModel: "model-tiny-1",
        fallbackStrategy: "default",
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Mock user selecting "Edit model levels", then "tiny", then "Add model", entering new model, then back, then save
      uiMock.select = vi
        .fn()
        .mockResolvedValueOnce("Edit model levels") // Main menu
        .mockResolvedValueOnce("tiny") // Select level
        .mockResolvedValueOnce("Add model") // Level submenu
        .mockResolvedValueOnce("Back to level menu") // Back from add
        .mockResolvedValueOnce("Back to main menu") // Back from level menu
        .mockResolvedValueOnce("Save configuration"); // Save
      uiMock.input = vi.fn().mockResolvedValueOnce("model-tiny-2"); // New model name

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert - should have called input for model name
      expect(uiMock.input).toHaveBeenCalledWith("Enter model name:");
    });

    it("should allow toggling metricsEnabled", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const initialConfig = {
        modelLevels: {},
        defaultModel: "",
        fallbackStrategy: "default",
        metricsEnabled: false,
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Mock user selecting "Toggle metrics tracking", then saving
      uiMock.select = vi
        .fn()
        .mockResolvedValueOnce("Toggle metrics tracking") // First menu selection
        .mockResolvedValueOnce("Save configuration"); // Save after toggle

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert - should have toggled metricsEnabled to true
      const savedConfig = JSON.parse(await readFile(configPath, "utf-8"));
      expect(savedConfig.metricsEnabled).toBe(true);

      // Should show notification about the change
      const toggleNotifications = notifyCalls.filter(
        (call) => call[0].includes("Metrics tracking") && call[0].includes("true"),
      );
      expect(toggleNotifications.length).toBeGreaterThan(0);
    });

    it("should display metricsEnabled in config", async () => {
      // Arrange
      const configPath = join(testDir, ".workflower", "config.json");
      const initialConfig = {
        modelLevels: {},
        defaultModel: "",
        fallbackStrategy: "default",
        metricsEnabled: true,
      };
      await writeFile(configPath, JSON.stringify(initialConfig, null, 2), "utf-8");

      // Act
      await handleConfigCommand("", mockCtx);

      // Assert - should display metricsEnabled in the config
      const displayMessage = notifyCalls.find((call) => call[1] === "info")?.[0];
      expect(displayMessage).toBeDefined();
      expect(displayMessage).toContain("Metrics Enabled: true");
    });
  });
});
