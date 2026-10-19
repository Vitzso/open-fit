// Public API of the Ollama connector. Import from "@/lib/ollama", not the files inside.
import "server-only";

export type { ChatMessage, ChatOptions, ContentPart, ChatRole, OllamaConfig, OllamaErrorCode, OllamaHealth, ReasoningEffort } from "./types";
export { isValidModelName, reasoningEffortFromEnv, resolveOllamaConfig, validateOllamaUrl } from "./config";
export { OllamaError } from "./errors";
export { getModelCapabilities } from "./capabilities";
export { chatCompletion, streamChatCompletion } from "./chat";
export { checkOllamaHealth } from "./health";
export { pullModel, type PullProgress } from "./pull";
export { ollamaBusyWith, releaseOllama, tryAcquireOllama } from "./lock";
export { runOllamaCheckup } from "./checkup";
export type { Check, CheckStatus, CheckupReport } from "./checkup/types";
