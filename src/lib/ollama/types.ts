// Shared types for the Ollama connector.

export type ChatRole = "system" | "user" | "assistant";

/** Part of a multimodal message: text, or an image as a data: URL (for vision models). */
export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: ChatRole;
  content: string | ContentPart[];
}

/** Where Ollama lives and which model to use. */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

/** For thinking models: "none" answers immediately; "low" | "medium" | "high" reason first (slower). */
export type ReasoningEffort = "none" | "low" | "medium" | "high";

export interface ChatOptions extends Partial<OllamaConfig> {
  temperature?: number;
  /** Max wait for the first token (model cold-load can take a while on CPU). */
  firstTokenTimeoutMs?: number;
  /** Max silence between streamed tokens once generation has started. */
  idleTimeoutMs?: number;
  /** Abort from outside, e.g. the HTTP request's signal when the client disconnects. */
  signal?: AbortSignal;
  reasoningEffort?: ReasoningEffort;
  /** Ask for JSON matching this schema (structured output), e.g. for parsing food estimates. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export type OllamaErrorCode = "UNREACHABLE" | "TIMEOUT" | "MODEL_NOT_FOUND" | "HTTP_ERROR" | "BAD_RESPONSE" | "ABORTED";

/** JSON form of an OllamaError, as sent to the browser. */
export interface OllamaErrorJson {
  error: string;
  code: OllamaErrorCode;
  hint?: string;
}

/** Result of the quick "is Ollama up and is the model installed" check. */
export interface OllamaHealth {
  ok: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  modelInstalled: boolean;
  error?: OllamaErrorJson;
}
