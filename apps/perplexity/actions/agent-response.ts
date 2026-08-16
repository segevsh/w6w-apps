import type { ActionDefinition } from "@w6w/types";
import { PerplexityClient } from "../lib/client.ts";

interface WebSearchFilters {
  searchDomainFilter?: string[];
  searchRecencyFilter?: "hour" | "day" | "week" | "month" | "year";
  searchAfterDateFilter?: string;
  searchBeforeDateFilter?: string;
  lastUpdatedAfterFilter?: string;
  lastUpdatedBeforeFilter?: string;
}

interface Input extends WebSearchFilters {
  // deno-lint-ignore no-explicit-any
  input: string | any[];
  instructions?: string;
  model?: string;
  models?: string[];
  preset?: "fast" | "low" | "medium" | "high" | "xhigh" | "wide-research";
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  maxOutputTokens?: number;
  maxSteps?: number;
  jsonSchema?: Record<string, unknown>;
  languagePreference?: string;
  previousResponseId?: string;
  store?: boolean;
  temperature?: number;
  topP?: number;
  enableWebSearch?: boolean;
  webSearchContextSize?: "low" | "medium" | "high";
  webSearchMaxResults?: number;
  webSearchMaxTokens?: number;
  webSearchMaxTokensPerPage?: number;
}

/**
 * POST /v1/agent — the **successor to `chat-completion` (Sonar)**, and the
 * surface to build on today; see that action's doc comment for the
 * 2026-09-27 sunset. Verified against
 * `https://docs.perplexity.ai/docs/agent-api/quickstart.md`,
 * `.../docs/agent-api/tools/web-search.md`, `.../docs/agent-api/presets.md`
 * (all fetched 2026-08-16) and the OpenAPI schemas `ResponsesRequest` /
 * `ResponsesResponse` / `WebSearchTool` / `OutputItem` / `SearchResultsOutputItem`
 * / `Annotation` in `https://docs.perplexity.ai/openapi.json` (same date) —
 * read directly, not inferred from the Sonar action. Live-probed:
 * `POST /v1/agent` unauthenticated -> `401 application/json`, the same
 * `invalid_api_key` shape as every other endpoint.
 *
 * ## Shape: `output[]`, not `choices[]`
 *
 * This is Perplexity's OpenAI-Responses-style surface, multi-provider (model
 * ids are `provider/model`, e.g. `openai/gpt-5.6-sol`, `anthropic/claude-sonnet-4-6`).
 * A non-streaming call returns `{id, status, model, output: OutputItem[], usage}`
 * rather than Sonar's `{choices, citations, search_results}`. `output` is a
 * heterogeneous array — a `message` item (`content[].text`, the answer text)
 * plus, when the `web_search` tool actually ran, a `search_results` item
 * (`{queries, results: [{id, url, title, snippet, date, last_updated, source}]}`)
 * emitted *before* the message. This action does not reshape `output` into
 * Sonar's flatter fields — see the README migration section for the mapping.
 *
 * ## Search parity with Sonar — verified, not assumed
 *
 * Every Sonar search filter modeled by `chat-completion.ts` has a documented
 * Agent API equivalent, nested under the `web_search` tool's `filters` (same
 * field names, verified against `docs/agent-api/tools/web-search.md`'s own
 * "Filters" table): `search_domain_filter`, `search_recency_filter`,
 * `search_after_date_filter`, `search_before_date_filter`,
 * `last_updated_after_filter`, `last_updated_before_filter`. Search is
 * **opt-in** here — Sonar always searches unless `disable_search` is set; the
 * Agent API only searches when a `web_search` tool is present in `tools` AND
 * the model decides to call it. `enableWebSearch` defaults to `true` so the
 * out-of-the-box behavior matches Sonar's, but a model can still choose not to
 * search a given prompt.
 *
 * ## Citations are not automatic — this is the one real gap, and it's documented, not silent
 *
 * Sonar always returns a top-level `citations: string[]`. The Agent API's raw
 * `web_search` tool does not: per `docs/agent-api/tools/web-search.md`,
 * "Whether the model adds \[inline citation\] markers to the answer is
 * prompt-dependent" — `Annotation` (`url_citation`) entries on a message's
 * content only appear if the prompt asks for them. The vendor's own mitigation
 * is `preset` (`fast`/`low`/`medium`/`high`/`xhigh`): every one of them bundles
 * a system prompt that requests inline citations, per `docs/agent-api/presets.md`'s
 * "Good at" column ("...with inline citations" on every preset but
 * `wide-research`). `preset` therefore defaults to `low` here rather than
 * leaving `model` as the only required field, so a default call gets Sonar-like
 * citations without the caller having to know this. A caller who supplies
 * `model`/`models` directly, without a `preset`, gets no citation guarantee
 * unless `instructions` asks for one. Regardless of markers, `search_results[].id`
 * / `.url` is the vendor's documented source of truth for citations either way.
 */
const agentResponse: ActionDefinition<Input> = {
  key: "agent-response",
  type: "perform",
  resource: "chat",
  idempotent: false,
  title: "Agent Response",
  description:
    "Generate a response using Perplexity's Agent API — the documented successor to Sonar " +
    "chat completions (see `chat-completion`), with multi-provider models, optional web " +
    "search, and an OpenAI-Responses-style `output[]` result. Prefer this action for new " +
    "work.",
  params: [
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: "A prompt string, or a JSON array of Agent API input items for multi-turn/tool-" +
        "result input.",
    },
    { key: "instructions", label: "Instructions (system prompt)", type: "text" },
    {
      key: "preset",
      label: "Preset",
      type: "select",
      default: "low",
      options: [
        { value: "fast", label: "Fast — single-fact lookups" },
        { value: "low", label: "Low — everyday research (default)" },
        { value: "medium", label: "Medium — multi-hop, wide aggregation" },
        { value: "high", label: "High — exhaustive source coverage" },
        { value: "xhigh", label: "XHigh — open-ended agentic work" },
        { value: "wide-research", label: "Wide Research — large evidence-backed collections" },
      ],
      hint: "Pre-configured model + search + system prompt. Every preset but Wide Research " +
        "bundles a system prompt requesting inline citations. Cleared automatically if you " +
        "set Model or Model fallback chain.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      hint: "provider/model, e.g. openai/gpt-5.6-sol, anthropic/claude-sonnet-4-6. Overrides " +
        "Preset when set.",
    },
    {
      key: "models",
      label: "Model fallback chain",
      type: "string",
      repeat: true,
      hint: "Up to 5 provider/model ids, tried in order. Overrides Model when set.",
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
        { value: "xhigh", label: "XHigh" },
        { value: "max", label: "Max" },
      ],
    },
    { key: "maxOutputTokens", label: "Max output tokens", type: "number" },
    {
      key: "maxSteps",
      label: "Max research steps",
      type: "number",
      hint: "1-100. Overrides the preset's step budget.",
    },
    {
      key: "jsonSchema",
      label: "JSON schema",
      type: "json",
      hint: "Constrain output to this JSON Schema. `{ schema: {...} }`.",
    },
    { key: "languagePreference", label: "Language preference", type: "string", hint: "ISO 639-1." },
    {
      key: "previousResponseId",
      label: "Previous response ID",
      type: "string",
      hint: "Continue a prior completed response for multi-turn conversation.",
    },
    {
      key: "store",
      label: "Store response",
      type: "boolean",
      hint: "When off, hides the response from later retrieve calls.",
    },
    { key: "temperature", label: "Temperature", type: "number", hint: "0-2." },
    { key: "topP", label: "Top P", type: "number", hint: "0-1." },
    {
      key: "enableWebSearch",
      label: "Enable web search",
      type: "boolean",
      default: true,
      hint: "Adds the web_search tool. The model still decides per-prompt whether to call it.",
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
    },
    { key: "webSearchMaxResults", label: "Max search results", type: "number", hint: "1-50." },
    { key: "webSearchMaxTokens", label: "Max total search content tokens", type: "number" },
    {
      key: "webSearchMaxTokensPerPage",
      label: "Max search content tokens per page",
      type: "number",
    },
    {
      key: "searchDomainFilter",
      label: "Search domain filter",
      type: "string",
      repeat: true,
      hint: "Up to 20 domains/URLs. Prefix with `-` to exclude instead of include.",
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
      hint: "MM/DD/YYYY.",
    },
    {
      key: "searchBeforeDateFilter",
      label: "Search before date",
      type: "string",
      hint: "MM/DD/YYYY.",
    },
    {
      key: "lastUpdatedAfterFilter",
      label: "Last updated after",
      type: "string",
      hint: "MM/DD/YYYY.",
    },
    {
      key: "lastUpdatedBeforeFilter",
      label: "Last updated before",
      type: "string",
      hint: "MM/DD/YYYY.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "model", type: "string", label: "Model" },
    { key: "output", type: "array", label: "Output items (message, search_results, ...)" },
    { key: "usage", type: "object", label: "Token usage and cost" },
    { key: "error", type: "object", label: "Error detail (on failure)" },
  ],

  execute(input, ctx) {
    const client = new PerplexityClient(ctx);
    const body: Record<string, unknown> = { input: input.input };

    if (input.instructions) body.instructions = input.instructions;
    if (input.model) body.model = input.model;
    if (input.models !== undefined && input.models.length > 0) body.models = input.models;
    if (input.preset) body.preset = input.preset;
    // Every documented path to a valid request needs model, models, or preset.
    // If a caller supplies none of the three, fall back to the vendor's own
    // recommended onboarding default rather than sending a request the API
    // will reject outright.
    if (!body.model && !body.models && !body.preset) body.preset = "low";

    if (input.reasoningEffort) body.reasoning = { effort: input.reasoningEffort };
    if (input.maxOutputTokens !== undefined) body.max_output_tokens = input.maxOutputTokens;
    if (input.maxSteps !== undefined) body.max_steps = input.maxSteps;
    if (input.jsonSchema) {
      body.response_format = { type: "json_schema", json_schema: input.jsonSchema };
    }
    if (input.languagePreference) body.language_preference = input.languagePreference;
    if (input.previousResponseId) body.previous_response_id = input.previousResponseId;
    if (input.store !== undefined) body.store = input.store;
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;

    if (input.enableWebSearch !== false) {
      const filters: Record<string, unknown> = {};
      if (input.searchDomainFilter !== undefined && input.searchDomainFilter.length > 0) {
        filters.search_domain_filter = input.searchDomainFilter;
      }
      if (input.searchRecencyFilter) filters.search_recency_filter = input.searchRecencyFilter;
      if (input.searchAfterDateFilter) {
        filters.search_after_date_filter = input.searchAfterDateFilter;
      }
      if (input.searchBeforeDateFilter) {
        filters.search_before_date_filter = input.searchBeforeDateFilter;
      }
      if (input.lastUpdatedAfterFilter) {
        filters.last_updated_after_filter = input.lastUpdatedAfterFilter;
      }
      if (input.lastUpdatedBeforeFilter) {
        filters.last_updated_before_filter = input.lastUpdatedBeforeFilter;
      }

      const webSearchTool: Record<string, unknown> = { type: "web_search" };
      if (Object.keys(filters).length > 0) webSearchTool.filters = filters;
      if (input.webSearchContextSize) {
        webSearchTool.search_context_size = input.webSearchContextSize;
      }
      if (input.webSearchMaxResults !== undefined) {
        webSearchTool.max_results = input.webSearchMaxResults;
      }
      if (input.webSearchMaxTokens !== undefined) {
        webSearchTool.max_tokens = input.webSearchMaxTokens;
      }
      if (input.webSearchMaxTokensPerPage !== undefined) {
        webSearchTool.max_tokens_per_page = input.webSearchMaxTokensPerPage;
      }
      body.tools = [webSearchTool];
    }

    return client.request("/v1/agent", { method: "POST", body });
  },
};

export default agentResponse;
