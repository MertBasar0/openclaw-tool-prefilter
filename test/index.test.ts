import { describe, expect, it, vi } from "vitest";
import pluginEntry from "../src/index.js";

describe("openclaw-tool-prefilter plugin", () => {
  it("registers before_prompt_build hook", () => {
    const registeredHooks: Record<string, Function> = {};
    const mockApi = {
      pluginConfig: { enabled: true },
      runtime: {
        decisions: {
          evaluate: vi.fn().mockResolvedValue({ status: "ok" }),
        },
      },
      on: vi.fn((name: string, handler: Function) => {
        registeredHooks[name] = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    expect(mockApi.on).toHaveBeenCalledWith("before_prompt_build", expect.any(Function));
    expect(typeof registeredHooks.before_prompt_build).toBe("function");
  });

  it("prunes all tools (returns toolsAllow: []) when pure conversation is detected", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockResolvedValue({
      status: "ok",
      result: {
        model: "jev-1.13.0",
        answers: {
          any_tool_needed: {
            type: "boolean",
            probabilityTrue: 0.08, // Pure conversation
          },
        },
      },
    });

    const mockApi = {
      pluginConfig: { enabled: true, thresholdAnyTool: 0.35 },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    const event = { currentUserMessage: "Hello, how are you today?" };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ toolsAllow: [] });
    expect(mockApi.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Pure conversation detected"),
    );
  });

  it("leaves tools unconstrained when tools are needed", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockResolvedValue({
      status: "ok",
      result: {
        model: "jev-1.13.0",
        answers: {
          any_tool_needed: {
            type: "boolean",
            probabilityTrue: 0.95, // High probability -> tools needed
          },
        },
      },
    });

    const mockApi = {
      pluginConfig: { enabled: true, thresholdAnyTool: 0.35 },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    const event = { currentUserMessage: "Check git status and commit changes" };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined(); // Unconstrained
  });

  it("fails open gracefully on decision provider error without throwing", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));

    const mockApi = {
      pluginConfig: { enabled: true },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    const event = { currentUserMessage: "Read the file foo.txt" };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(result).toBeUndefined(); // Fails open
    expect(mockApi.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Decision check failed, failing open"),
    );
  });

  it("does not classify prompt history when currentUserMessage is explicitly empty", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockResolvedValue({ status: "ok" });

    const mockApi = {
      pluginConfig: { enabled: true },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    // Explicitly empty message with rich prompt history
    const event = {
      currentUserMessage: "   ",
      prompt: "System: You are an agent.\nUser: Previous request\nAssistant: Done",
    };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("falls back to prompt when currentUserMessage is omitted/undefined", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockResolvedValue({
      status: "ok",
      result: {
        model: "jev-1.13.0",
        answers: {
          any_tool_needed: {
            type: "boolean",
            probabilityTrue: 0.1,
          },
        },
      },
    });

    const mockApi = {
      pluginConfig: { enabled: true },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    const event = { prompt: "Just saying hello" };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(mockEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { userMessage: "Just saying hello" },
      }),
      expect.anything(),
    );
    expect(result).toEqual({ toolsAllow: [] });
  });

  it("returns undefined without calling evaluate if config.enabled is false", async () => {
    let hookHandler: Function = () => {};
    const mockEvaluate = vi.fn().mockResolvedValue({ status: "ok" });

    const mockApi = {
      pluginConfig: { enabled: false },
      runtime: {
        decisions: {
          evaluate: mockEvaluate,
        },
      },
      on: vi.fn((_name: string, handler: Function) => {
        hookHandler = handler;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    };

    pluginEntry.register(mockApi as any);

    const event = { currentUserMessage: "Hello" };
    const ctx = { agentId: "agent-1" };

    const result = await hookHandler(event, ctx);

    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
