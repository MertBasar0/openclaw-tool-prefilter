export interface ToolPreFilterPluginConfig {
    /** Whether the pre-filter is enabled. Default: true */
    enabled?: boolean;
    /** Probability threshold below which all tool schemas are pruned. Default: 0.35 */
    thresholdAnyTool?: number;
    /** Timeout in milliseconds for decision evaluation. Default: 500 */
    timeoutMs?: number;
}
export interface BeforePromptBuildEvent {
    prompt?: string;
    currentUserMessage?: string;
    currentUserMessageId?: string;
    messages?: unknown[];
}
export interface BeforePromptBuildContext {
    agentId?: string;
    sessionId?: string;
}
export interface BeforePromptBuildResult {
    toolsAllow?: string[];
    prependContext?: string;
    appendContext?: string;
    systemPrompt?: string;
}
export interface DecisionEvaluationOutcome {
    status: "ok" | "unavailable";
    result?: {
        model: string;
        answers?: Record<string, {
            type: "boolean" | "choice" | "score";
            probabilityTrue?: number;
            choice?: string;
            score?: number;
        }>;
    };
    reason?: string;
}
export interface OpenClawPluginApi {
    pluginConfig?: Record<string, unknown>;
    runtime?: {
        decisions?: {
            evaluate(batch: {
                state: Record<string, unknown>;
                questions: Record<string, {
                    type: string;
                    instructions: string;
                }>;
            }, options?: {
                agentId?: string;
                purpose?: string;
                rubricVersion?: string;
                timeoutMs?: number;
                signal?: AbortSignal;
            }): Promise<DecisionEvaluationOutcome>;
        };
    };
    on(event: "before_prompt_build", handler: (event: BeforePromptBuildEvent, ctx: BeforePromptBuildContext) => Promise<BeforePromptBuildResult | undefined>): void;
    logger?: {
        info(msg: string): void;
        warn(msg: string): void;
        error(msg: string): void;
        debug(msg: string): void;
    };
}
export interface PluginEntryDefinition {
    id: string;
    name: string;
    description: string;
    register(api: OpenClawPluginApi): void;
}
export declare function definePluginEntry(def: PluginEntryDefinition): PluginEntryDefinition;
declare const _default: PluginEntryDefinition;
export default _default;
//# sourceMappingURL=index.d.ts.map