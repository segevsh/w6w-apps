import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("text-get: the default plain format sends no text_format and returns the Markdown", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "text/html" }, body: "# Hi" }]);
  const out = await action.execute({ url: "https://e.test", returnLinks: true }, ctx);
  assertEquals(out, { text: "# Hi", requestId: undefined });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.has("text_format"), false);
  assertEquals(q.has("return_links"), false);
});

Deno.test("text-get: json format spreads title/description/content and sends return_links", async () => {
  const doc = { title: "T", description: "D", content: "C", links: ["https://x.test"] };
  const { ctx, calls } = mockCtx([{ body: JSON.stringify(doc) }]);
  const out = await action.execute({
    url: "https://e.test",
    textFormat: "json",
    returnLinks: true,
  }, ctx);
  assertEquals(out, { ...doc, requestId: undefined });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("text_format"), "json");
  assertEquals(q.get("return_links"), "true");
});

Deno.test("text-get: xml comes back as text; a non-JSON body for json and a bad format are errors", async () => {
  const xml = mockCtx([{ headers: { "content-type": "text/xml" }, body: "<title>T</title>" }]);
  const out = await action.execute({ url: "https://e.test", textFormat: "xml" }, xml.ctx);
  assertEquals((out as { text: string }).text, "<title>T</title>");
  assertEquals(new URL(xml.calls[0].url).searchParams.get("text_format"), "xml");
  const bad = mockCtx([{ headers: { "content-type": "text/html" }, body: "plain" }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", textFormat: "json" }, bad.ctx),
    Error,
    "expected a JSON document",
  );
  const none = mockCtx();
  await assertRejects(
    async () =>
      await action.execute({
        url: "https://e.test",
        textFormat: "yaml" as unknown as "json",
      }, none.ctx),
    Error,
    "Format must be",
  );
  assertEquals(none.calls.length, 0);
});
