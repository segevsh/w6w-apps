import { assertEquals, assertRejects } from "@std/assert";
import search from "../../actions/search.ts";
import { mockCtx } from "../_helpers.ts";

const SCHEMA = { type: "object", properties: { revenue: { type: "number" } } };

Deno.test("search: searchResults posts depth and outputType and returns results", async () => {
  const results = [{ type: "text", name: "n", url: "https://a", content: "c", favicon: "" }];
  const { ctx, calls } = mockCtx([{ body: { results } }]);
  const out = await search.execute({
    q: " What is X? ",
    depth: "fast",
    outputType: "searchResults",
    maxResults: 5,
    includeImages: true,
    fromDate: "2026-01-01",
    includeDomains: "a.com\nb.com",
    excludeDomains: ["c.com"],
  }, ctx);
  assertEquals(out, { outputType: "searchResults", results });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkup.so/v1/search");
  assertEquals(JSON.parse(calls[0].body!), {
    q: "What is X?",
    depth: "fast",
    outputType: "searchResults",
    includeImages: true,
    maxResults: 5,
    fromDate: "2026-01-01",
    includeDomains: ["a.com", "b.com"],
    excludeDomains: ["c.com"],
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("search: sourcedAnswer returns answer and sources; citations flag only applies there", async () => {
  const { ctx, calls } = mockCtx([{ body: { answer: "42", sources: [{ name: "s" }] } }]);
  const out = await search.execute({
    q: "q",
    depth: "deep",
    outputType: "sourcedAnswer",
    includeInlineCitations: true,
    includeSources: true,
  }, ctx);
  assertEquals(out, { outputType: "sourcedAnswer", answer: "42", sources: [{ name: "s" }] });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includeInlineCitations, true);
  assertEquals("includeSources" in body, false);
});

Deno.test("search: structured sends the schema as a string; the body is the data", async () => {
  const { ctx, calls } = mockCtx([{ body: { revenue: 5 } }]);
  const out = await search.execute({
    q: "q",
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: SCHEMA,
  }, ctx);
  assertEquals(out, { outputType: "structured", data: { revenue: 5 } });
  assertEquals(JSON.parse(calls[0].body!).structuredOutputSchema, JSON.stringify(SCHEMA));
});

Deno.test("search: structured with sources returns { data, sources }", async () => {
  const { ctx } = mockCtx([{ body: { data: { revenue: 5 }, sources: [{ url: "u" }] } }]);
  const out = await search.execute({
    q: "q",
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: JSON.stringify(SCHEMA),
    includeSources: true,
  }, ctx);
  assertEquals(out, { outputType: "structured", data: { revenue: 5 }, sources: [{ url: "u" }] });
});

Deno.test("search: validation fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await search.execute({ q: " ", outputType: "searchResults" }, ctx),
    Error,
    "Query",
  );
  await assertRejects(
    async () => await search.execute({ q: "q", outputType: "structured" }, ctx),
    Error,
    "Output schema is required",
  );
  await assertRejects(
    async () => await search.execute({ q: "q", outputType: "searchResults", depth: "slow" }, ctx),
    Error,
    "depth",
  );
  await assertRejects(
    async () => await search.execute({ q: "q", outputType: "nope" }, ctx),
    Error,
    "outputType",
  );
  await assertRejects(
    async () => await search.execute({ q: "q", outputType: "searchResults", maxResults: 0 }, ctx),
    Error,
    "Max results",
  );
  assertEquals(calls.length, 0);
});

Deno.test("search: the generic action takes the output type and an optional schema", () => {
  const byKey = (k: string) => search.params!.find((p) => p.key === k)!;
  assertEquals(byKey("outputType").required, true);
  assertEquals(byKey("depth").required, true);
  assertEquals(byKey("structuredOutputSchema").required, undefined);
  assertEquals(
    (byKey("depth").options as Array<{ value: string }>).map((o) => o.value),
    ["flash", "fast", "standard", "deep"],
  );
});
