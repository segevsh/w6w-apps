import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-completion.ts";

Deno.test("chat-completion: POSTs /v1/sonar with model + messages only", async () => {
  const body = { id: "cmpl-1", choices: [], citations: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      model: "sonar",
      messages: [{ role: "user", content: "hi" }],
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/sonar");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "sonar",
    messages: [{ role: "user", content: "hi" }],
  });
  assertEquals(result, body);
});

Deno.test("chat-completion: forwards optional params with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "sonar-pro",
      messages: [{ role: "user", content: "x" }],
      temperature: 0.4,
      topP: 0.9,
      maxTokens: 512,
      stop: ["\n\n"],
      searchMode: "academic",
      returnImages: true,
      returnRelatedQuestions: true,
      enableSearchClassifier: false,
      disableSearch: false,
      searchDomainFilter: ["wikipedia.org", "-pinterest.com"],
      searchLanguageFilter: ["en"],
      searchRecencyFilter: "week",
      searchAfterDateFilter: "1/1/2026",
      searchBeforeDateFilter: "12/31/2026",
      lastUpdatedAfterFilter: "1/1/2026",
      lastUpdatedBeforeFilter: "12/31/2026",
      reasoningEffort: "high",
      languagePreference: "en",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.temperature, 0.4);
  assertEquals(sent.top_p, 0.9);
  assertEquals(sent.max_tokens, 512);
  assertEquals(sent.stop, ["\n\n"]);
  assertEquals(sent.search_mode, "academic");
  assertEquals(sent.return_images, true);
  assertEquals(sent.return_related_questions, true);
  assertEquals(sent.enable_search_classifier, false);
  assertEquals(sent.disable_search, false);
  assertEquals(sent.search_domain_filter, ["wikipedia.org", "-pinterest.com"]);
  assertEquals(sent.search_language_filter, ["en"]);
  assertEquals(sent.search_recency_filter, "week");
  assertEquals(sent.search_after_date_filter, "1/1/2026");
  assertEquals(sent.search_before_date_filter, "12/31/2026");
  assertEquals(sent.last_updated_after_filter, "1/1/2026");
  assertEquals(sent.last_updated_before_filter, "12/31/2026");
  assertEquals(sent.reasoning_effort, "high");
  assertEquals(sent.language_preference, "en");
});

Deno.test("chat-completion: nests web search context/type under web_search_options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "sonar",
      messages: [{ role: "user", content: "x" }],
      webSearchContextSize: "high",
      webSearchType: "pro",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.web_search_options, { search_context_size: "high", search_type: "pro" });
});

Deno.test("chat-completion: response_format text is sent as { type: 'text' }", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "sonar", messages: [{ role: "user", content: "x" }], responseFormat: "text" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).response_format, { type: "text" });
});

Deno.test("chat-completion: response_format json_schema carries the schema through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const jsonSchema = { schema: { type: "object", properties: { answer: { type: "string" } } } };
  await action.execute!(
    {
      model: "sonar",
      messages: [{ role: "user", content: "x" }],
      responseFormat: "json_schema",
      jsonSchema,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).response_format, {
    type: "json_schema",
    json_schema: jsonSchema,
  });
});

Deno.test("chat-completion: omits undefined optional params and empty arrays from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "sonar",
      messages: [{ role: "user", content: "x" }],
      stop: [],
      searchDomainFilter: [],
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["messages", "model"]);
});
