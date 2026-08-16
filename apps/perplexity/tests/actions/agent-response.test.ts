import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/agent-response.ts";

Deno.test("agent-response: POSTs /v1/agent with input only, defaulting to preset low", async () => {
  const body = { id: "resp_1", status: "completed", model: "openai/gpt-5.6-sol", output: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ input: "hello" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/agent");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.input, "hello");
  assertEquals(sent.preset, "low");
  // Web search defaults on with no filters, so no `filters` key is sent.
  assertEquals(sent.tools, [{ type: "web_search" }]);
  assertEquals(result, body);
});

Deno.test("agent-response: accepts a structured input array unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const input = [{ type: "message", role: "user", content: "hi" }];
  await action.execute!({ input }, ctx);
  assertEquals(JSON.parse(calls[0].body!).input, input);
});

Deno.test("agent-response: model takes preset out of the request", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "x", model: "anthropic/claude-sonnet-4-6" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.model, "anthropic/claude-sonnet-4-6");
  assertEquals("preset" in sent, false);
});

Deno.test("agent-response: models fallback chain is forwarded alongside model", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      input: "x",
      model: "openai/gpt-5.6-sol",
      models: ["openai/gpt-5.6-sol", "anthropic/claude-sonnet-4-6"],
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.model, "openai/gpt-5.6-sol");
  assertEquals(sent.models, ["openai/gpt-5.6-sol", "anthropic/claude-sonnet-4-6"]);
});

Deno.test("agent-response: forwards optional top-level params with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      input: "x",
      preset: "high",
      instructions: "be concise",
      reasoningEffort: "high",
      maxOutputTokens: 1024,
      maxSteps: 10,
      languagePreference: "en",
      previousResponseId: "resp_prev",
      store: false,
      temperature: 0.5,
      topP: 0.8,
      enableWebSearch: false,
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.preset, "high");
  assertEquals(sent.instructions, "be concise");
  assertEquals(sent.reasoning, { effort: "high" });
  assertEquals(sent.max_output_tokens, 1024);
  assertEquals(sent.max_steps, 10);
  assertEquals(sent.language_preference, "en");
  assertEquals(sent.previous_response_id, "resp_prev");
  assertEquals(sent.store, false);
  assertEquals(sent.temperature, 0.5);
  assertEquals(sent.top_p, 0.8);
  assertEquals("tools" in sent, false, "enableWebSearch: false must omit tools entirely");
});

Deno.test("agent-response: json schema is sent as response_format", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const jsonSchema = { schema: { type: "object", properties: { answer: { type: "string" } } } };
  await action.execute!({ input: "x", jsonSchema }, ctx);
  assertEquals(JSON.parse(calls[0].body!).response_format, {
    type: "json_schema",
    json_schema: jsonSchema,
  });
});

Deno.test("agent-response: web search filters nest under tools[0].filters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      input: "x",
      searchDomainFilter: ["nasa.gov", "-pinterest.com"],
      searchRecencyFilter: "month",
      searchAfterDateFilter: "1/1/2026",
      searchBeforeDateFilter: "12/31/2026",
      lastUpdatedAfterFilter: "1/1/2026",
      lastUpdatedBeforeFilter: "12/31/2026",
      webSearchContextSize: "high",
      webSearchMaxResults: 20,
      webSearchMaxTokens: 6000,
      webSearchMaxTokensPerPage: 1200,
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.tools, [
    {
      type: "web_search",
      filters: {
        search_domain_filter: ["nasa.gov", "-pinterest.com"],
        search_recency_filter: "month",
        search_after_date_filter: "1/1/2026",
        search_before_date_filter: "12/31/2026",
        last_updated_after_filter: "1/1/2026",
        last_updated_before_filter: "12/31/2026",
      },
      search_context_size: "high",
      max_results: 20,
      max_tokens: 6000,
      max_tokens_per_page: 1200,
    },
  ]);
});

Deno.test("agent-response: an empty search_domain_filter array does not add an empty filters object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "x", searchDomainFilter: [] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.tools, [{ type: "web_search" }]);
});

Deno.test("agent-response: omits undefined optional params from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "x" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["input", "preset", "tools"]);
});
