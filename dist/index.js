export function definePluginEntry(def) {
    return def;
}
export default definePluginEntry({
    id: "tool-prefilter",
    name: "Tool Pre-filter",
    description: "Dynamic two-stage skill and tool pre-filtering using decision models (Jev / TypeSafe) to reduce context overhead and eliminate tool hallucinations.",
    register(api) {
        api.on("before_prompt_build", async (event, ctx) => {
            const config = (api.pluginConfig ?? {});
            if (config.enabled === false) {
                return undefined;
            }
            // If the runtime decisions evaluation is not available, fail-open gracefully
            const decisions = api.runtime?.decisions;
            if (!decisions || typeof decisions.evaluate !== "function") {
                return undefined;
            }
            // Respect explicit request boundaries: an explicit empty string means no textual request
            // (such as image-only input or continuations) and must not fall back to history (prompt).
            const rawMessage = event.currentUserMessage !== undefined
                ? event.currentUserMessage
                : event.prompt;
            const userMessage = typeof rawMessage === "string" ? rawMessage.trim() : "";
            if (!userMessage) {
                return undefined;
            }
            const threshold = config.thresholdAnyTool ?? 0.35;
            const timeoutMs = config.timeoutMs ?? 500;
            const controller = new AbortController();
            const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const outcome = await decisions.evaluate({
                    state: { userMessage },
                    questions: {
                        any_tool_needed: {
                            type: "boolean",
                            instructions: "Does this user prompt require executing an external tool (such as bash, git, file reading/writing, web search, database operations, or APIs), or can it be answered purely as conversational knowledge/dialogue?",
                        },
                    },
                }, {
                    agentId: ctx.agentId,
                    purpose: "tool-prefilter.semantic-gate",
                    rubricVersion: "1",
                    timeoutMs,
                    signal: controller.signal,
                });
                if (outcome && outcome.status === "ok" && outcome.result?.answers) {
                    const answer = outcome.result.answers.any_tool_needed;
                    const prob = answer && answer.type === "boolean" && typeof answer.probabilityTrue === "number"
                        ? answer.probabilityTrue
                        : 0.5;
                    // Pure conversational turn: strip optional tools from the model context
                    if (prob < threshold) {
                        api.logger?.info(`[tool-prefilter] Pure conversation detected (tool probability: ${(prob * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%). Pruning tools to save context.`);
                        return {
                            toolsAllow: [],
                        };
                    }
                }
            }
            catch (err) {
                // Fail-open: network glitches or decision provider errors must never break agent conversation
                api.logger?.warn(`[tool-prefilter] Decision check failed, failing open: ${String(err)}`);
            }
            finally {
                clearTimeout(timeoutHandle);
            }
            return undefined;
        });
    },
});
//# sourceMappingURL=index.js.map