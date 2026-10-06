import { assertEquals, assertRejects } from "@std/assert";
import scrape from "../../actions/web-scrape.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("web-scrape: GETs /web/scrape with url, and noLinks/lang only when set", async () => {
  const body = { url: "https://e.test", content: "# Hi", countCharacters: 4, urls: [] };
  const { ctx, calls } = mockCtx([{ body }, { body }]);
  assertEquals(await scrape.execute({ url: "https://e.test" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/web/scrape?url=https%3A%2F%2Fe.test");
  await scrape.execute({ url: "https://e.test", noLinks: true, lang: "de" }, ctx);
  const q = new URL(calls[1].url).searchParams;
  assertEquals(q.get("noLinks"), "true");
  assertEquals(q.get("lang"), "de");
});

Deno.test("web-scrape: an HTML error body is surfaced by its title; a blank url makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<html><title>Bad Gateway</title></html>",
  }]);
  await assertRejects(
    async () => await scrape.execute({ url: "https://e.test" }, ctx),
    Error,
    "Bad Gateway",
  );
  const none = mockCtx();
  await assertRejects(async () => await scrape.execute({ url: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
