import { assertEquals, assertRejects } from "@std/assert";
import extract from "../../actions/extract-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("extract-start: POSTs url + prompt + parsed schema and returns the job id", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { jobId: "e1" } }]);
  const out = await extract.execute(
    { url: "https://youtu.be/x", prompt: " list products ", schema: '{"type":"object"}' },
    ctx,
  );
  assertEquals(out, { jobId: "e1" });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/extract");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://youtu.be/x",
    prompt: "list products",
    schema: { type: "object" },
  });
});

Deno.test("extract-start: a schema object alone is enough; neither prompt nor schema is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "e2" } }]);
  await extract.execute({ url: "https://x.test/v", schema: { type: "object" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://x.test/v", schema: { type: "object" } });
  const none = mockCtx();
  await assertRejects(
    async () => await extract.execute({ url: "https://x.test/v" }, none.ctx),
    Error,
    "prompt, a schema",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("extract-start: an unparseable or non-object schema is refused before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await extract.execute({ url: "u", schema: "{nope" }, ctx),
    Error,
    "JSON object",
  );
  await assertRejects(
    async () => await extract.execute({ url: "u", schema: "[1]" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});
