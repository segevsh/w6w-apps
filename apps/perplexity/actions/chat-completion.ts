import type { ActionDefinition } from "@w6w/types";
import { PerplexityClient } from "../lib/client.ts";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface Input {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  searchMode?: "web" | "academic" | "sec";
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  enableSearchClassifier?: boolean;
  disableSearch?: boolean;
  searchDomainFilter?: string[];
  searchLanguageFilter?: string[];
  searchRecencyFilter?: "hour" | "day" | "week" | "month" | "year";
  searchAfterDateFilter?: string;
  searchBeforeDateFilter?: string;
  lastUpdatedAfterFilter?: string;
  lastUpdatedBeforeFilter?: string;
  webSearchContextSize?: "low" | "medium" | "high";
  webSearchType?: "fast" | "pro" | "auto";
  responseFormat?: "text" | "json_schema";
  jsonSchema?: Record<string, unknown>;
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
  languagePreference?: string;
}

/**
 * POST /v1/sonar — Perplexity's "Sonar" chat completions, an OpenAI-shaped
 * `messages` in / `choices` out call that also runs live web search and
 * returns `citations` + `search_results` alongside the answer.
 *
 * Verified against `https://docs.perplexity.ai/openapi.json` (fetched
 * 2026-08-16) and live probes against `api.perplexity.ai`: `POST /v1/sonar`
 * and the older, still-live alias `POST /chat/completions` both answer
 * unauthenticated `401 application/json`
 * `{"error":{"message":"Invalid API key provided...","type":"invalid_api_key",
 * "code":401}}`, and a bogus sibling path (`POST /v1/totally-bogus-path`)
 * answers a bare `404` with an empty body — so this is a real, routed
 * endpoint, not a catch-all. `/v1/sonar` is used here because it is the path
 * the OpenAPI document itself declares as canonical for this operation.
 *
 * ## Sonar is being retired — use `agent-response` for new work
 *
 * The docs page for this exact operation carries a standing banner (captured
 * verbatim, 2026-08-16): "Sonar Chat Completions is now Agent API. Sonar will
 * be supported until September 27, 2026." The successor, `POST /v1/agent`, is
 * modeled as the `agent-response` action in this same app (`actions/agent-response.ts`)
 * — it returns a differently-shaped `response.output[]` (OpenAI Responses-style)
 * rather than `choices[]` and spans multiple third-party model providers, so it
 * is a new action rather than a drop-in swap. See the README's migration
 * section for the field-by-field mapping and existing callers of this action
 * keep working unchanged until the sunset date.
 *
 * Streaming (`stream: true`) is intentionally not modeled — see the README.
 */
const chatCompletion: ActionDefinition<Input> = {
  key: "chat-completion",
  type: "perform",
  resource: "chat",
  title: "Chat Completion (Sonar — retiring 2026-09-27)",
  description:
    "Generate a web-grounded chat completion from a Sonar model, with citations and search " +
    "results. Sonar is deprecated by Perplexity in favor of the Agent API, effective " +
    "2026-09-27 — use the `agent-response` action for new work. See the README.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "sonar",
      hint: "sonar, sonar-pro, sonar-reasoning-pro, or sonar-deep-research (published enum, " +
        "may change — see README).",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects.",
    },
    { key: "temperature", label: "Temperature", type: "number", hint: "0-2." },
    { key: "topP", label: "Top P", type: "number", hint: "0-1." },
    { key: "maxTokens", label: "Max tokens", type: "number", hint: "Up to 128000." },
    { key: "stop", label: "Stop sequences", type: "string", repeat: true },
    {
      key: "searchMode",
      label: "Search mode",
      type: "select",
      options: [
        { value: "web", label: "Web" },
        { value: "academic", label: "Academic" },
        { value: "sec", label: "SEC filings" },
      ],
      hint: "Source of search results used to ground the answer.",
    },
    {
      key: "webSearchContextSize",
      label: "Search context size",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
      hint: "How much web content to feed the model. Defaults to low.",
    },
    {
      key: "webSearchType",
      label: "Search type",
      type: "select",
      options: [
        { value: "fast", label: "Fast" },
        { value: "pro", label: "Pro (higher quality)" },
        { value: "auto", label: "Auto (model decides)" },
      ],
    },
    {
      key: "searchDomainFilter",
      label: "Search domain filter",
      type: "string",
      repeat: true,
      hint: "Limit search results to these domains (max 20), e.g. wikipedia.org. Prefix a " +
        "domain with `-` to exclude it instead.",
    },
    {
      key: "searchLanguageFilter",
      label: "Search language filter",
      type: "string",
      repeat: true,
      hint: "ISO 639-1 codes, e.g. en, fr.",
    },
    {
      key: "searchRecencyFilter",
      label: "Search recency filter",
      type: "select",
      options: [
        { value: "hour", label: "Past hour" },
        { value: "day", label: "Past day" },
        { value: "week", label: "Past week" },
        { value: "month", label: "Past month" },
        { value: "year", label: "Past year" },
      ],
    },
    {
      key: "searchAfterDateFilter",
      label: "Search after date",
      type: "string",
      hint: "MM/DD/YYYY — only results published after this date.",
    },
    {
      key: "searchBeforeDateFilter",
      label: "Search before date",
      type: "string",
      hint: "MM/DD/YYYY — only results published before this date.",
    },
    {
      key: "lastUpdatedAfterFilter",
      label: "Last updated after",
      type: "string",
      hint: "MM/DD/YYYY — only results last updated after this date.",
    },
    {
      key: "lastUpdatedBeforeFilter",
      label: "Last updated before",
      type: "string",
      hint: "MM/DD/YYYY — only results last updated before this date.",
    },
    { key: "returnImages", label: "Return images", type: "boolean", default: false },
    {
      key: "returnRelatedQuestions",
      label: "Return related questions",
      type: "boolean",
      default: false,
    },
    {
      key: "enableSearchClassifier",
      label: "Enable search classifier",
      type: "boolean",
      hint: "Let a classifier decide whether this query needs web search at all.",
    },
    {
      key: "disableSearch",
      label: "Disable search",
      type: "boolean",
      default: false,
      hint: "Answer from the model's training data only, no web search.",
    },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text (default)" },
        { value: "json_schema", label: "JSON schema" },
      ],
    },
    {
      key: "jsonSchema",
      label: "JSON schema",
      type: "json",
      hint: "Required when response format is JSON schema. `{ schema: {...} }`, JSON Schema " +
        "the completion must conform to.",
    },
    {
      key: "reasoningEffort",
      label: "Reasoning effort",
      type: "select",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    {
      key: "languagePreference",
      label: "Language preference",
      type: "string",
      hint: "ISO 639-1 code for the preferred response language, e.g. en.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Completion ID" },
    { key: "model", type: "string", label: "Model" },
    { key: "choices", type: "array", label: "Choices" },
    { key: "citations", type: "array", label: "Citation URLs" },
    { key: "search_results", type: "array", label: "Search results" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new PerplexityClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.stop !== undefined && input.stop.length > 0) body.stop = input.stop;
    if (input.searchMode) body.search_mode = input.searchMode;
    if (input.returnImages !== undefined) body.return_images = input.returnImages;
    if (input.returnRelatedQuestions !== undefined) {
      body.return_related_questions = input.returnRelatedQuestions;
    }
    if (input.enableSearchClassifier !== undefined) {
      body.enable_search_classifier = input.enableSearchClassifier;
    }
    if (input.disableSearch !== undefined) body.disable_search = input.disableSearch;
    if (input.searchDomainFilter !== undefined && input.searchDomainFilter.length > 0) {
      body.search_domain_filter = input.searchDomainFilter;
    }
    if (input.searchLanguageFilter !== undefined && input.searchLanguageFilter.length > 0) {
      body.search_language_filter = input.searchLanguageFilter;
    }
    if (input.searchRecencyFilter) body.search_recency_filter = input.searchRecencyFilter;
    if (input.searchAfterDateFilter) body.search_after_date_filter = input.searchAfterDateFilter;
    if (input.searchBeforeDateFilter) {
      body.search_before_date_filter = input.searchBeforeDateFilter;
    }
    if (input.lastUpdatedAfterFilter) {
      body.last_updated_after_filter = input.lastUpdatedAfterFilter;
    }
    if (input.lastUpdatedBeforeFilter) {
      body.last_updated_before_filter = input.lastUpdatedBeforeFilter;
    }
    if (input.webSearchContextSize || input.webSearchType) {
      body.web_search_options = {
        ...(input.webSearchContextSize ? { search_context_size: input.webSearchContextSize } : {}),
        ...(input.webSearchType ? { search_type: input.webSearchType } : {}),
      };
    }
    if (input.responseFormat === "json_schema") {
      body.response_format = { type: "json_schema", json_schema: input.jsonSchema };
    } else if (input.responseFormat === "text") {
      body.response_format = { type: "text" };
    }
    if (input.reasoningEffort) body.reasoning_effort = input.reasoningEffort;
    if (input.languagePreference) body.language_preference = input.languagePreference;

    return client.request("/v1/sonar", { method: "POST", body });
  },
};

export default chatCompletion;
