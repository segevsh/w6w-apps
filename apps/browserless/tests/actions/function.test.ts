import { assertEquals, assertRejects } from "@std/assert";
import fn from "../../actions/function.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("function: sends code and context, parses a JSON result", async () => {
  const { ctx, calls } = mockCtx([{ body: { title: "T" } }]);
  const out = await fn.execute(
    {
      code: "export default async () => ({data:{title:'T'},type:'application/json'})",
      context: { a: 1 },
    },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.data, { title: "T" });
  assertEquals(out.contentType, "application/json");
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/function");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!).context, { a: 1 });
});

Deno.test("function: text results come back as text, binary as base64", async () => {
  const text = mockCtx([{ headers: { "content-type": "text/plain" }, body: "hello" }]);
  const t = await fn.execute({ code: "x" }, text.ctx) as Record<string, unknown>;
  assertEquals(t.text, "hello");
  assertEquals(t.base64, undefined);

  const bin = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: new Uint8Array([1, 2, 3]),
  }]);
  const b = await fn.execute({ code: "x" }, bin.ctx) as Record<string, unknown>;
  assertEquals(b.base64, "AQID");
  assertEquals(b.sizeBytes, 3);
});

Deno.test("function: empty code and bad context are refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await fn.execute({ code: "  " }, ctx), Error, "Code is required");
  await assertRejects(
    async () => await fn.execute({ code: "x", context: "[1]" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});
