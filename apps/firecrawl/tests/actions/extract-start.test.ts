import { assertEquals, assertRejects } from "@std/assert";
import extractStart from "../../actions/extract-start.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("extract-start: POSTs urls, prompt and parsed schema", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "e1" } }]);
  const out = await extractStart.execute(
    {
      urls: "https://a.example/*, https://b.example",
      prompt: "Get the page title",
      schema: '{"type":"object","properties":{"title":{"type":"string"}}}',
    },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v2/extract");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.urls, ["https://a.example/*", "https://b.example"]);
  assertEquals(body.prompt, "Get the page title");
  assertEquals(body.schema, { type: "object", properties: { title: { type: "string" } } });
  assertEquals(out.id, "e1");
});

Deno.test("extract-start: schema also accepts an already-parsed object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "e1" } }]);
  await extractStart.execute({ urls: "https://a.example", schema: { type: "object" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).schema, { type: "object" });
});

Deno.test("extract-start: malformed schema JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    // `execute` throws synchronously here (schema parsing happens while building the request
    // body, before any fetch): an async wrapper turns that into the rejection assertRejects
    // expects, whereas `Promise.resolve(execute(...))` would let the throw escape uncaught.
    async () => await extractStart.execute({ urls: "https://a.example", schema: "{not json" }, ctx),
    Error,
    "JSON Schema is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("extract-start: is declared non-idempotent", () => {
  assertEquals(extractStart.idempotent, false);
});
