import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/extract-html.ts";
import { mockCtx, run } from "../_helpers.ts";
import { ARTICLE_DOC } from "../_fixtures.ts";

Deno.test("extract-html: POSTs the markup as text/html to the chosen API", async () => {
  const { ctx, calls } = mockCtx([{ body: ARTICLE_DOC }]);
  const out = await run(action, {
    api: "article",
    url: "https://store.example",
    content: "<html><body><h1>Hi</h1></body></html>",
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.diffbot.com/v3/article");
  assertEquals(u.searchParams.get("url"), "https://store.example");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "text/html");
  assertEquals(calls[0].body, "<html><body><h1>Hi</h1></body></html>");
  assertEquals(out.count, 1);
});

Deno.test("extract-html: text/plain only for article; unknown API refused before any call", async () => {
  const ok = mockCtx([{ body: ARTICLE_DOC }]);
  await run(action, {
    api: "article",
    url: "https://e.com",
    content: "words",
    contentType: "text/plain",
  }, ok.ctx);
  assertEquals(ok.calls[0].headers["content-type"], "text/plain");

  const bad = mockCtx();
  await assertRejects(
    () =>
      run(
        action,
        { api: "product", url: "https://e.com", content: "x", contentType: "text/plain" },
        bad.ctx,
      ),
    Error,
    "Article API",
  );
  await assertRejects(
    () => run(action, { api: "../crawl", url: "https://e.com", content: "x" }, bad.ctx),
    Error,
    "Unknown Extract API",
  );
  assertEquals(bad.calls.length, 0);
});
