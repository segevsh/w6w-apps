import { assertEquals } from "@std/assert";
import crawlList from "../../actions/crawl-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("crawl-list: forwards status, limit and cursor", async () => {
  const reply = { data: [{ id: "c1" }], nextCursor: "n" };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await crawlList.execute({ status: "completed", limit: 5, cursor: " abc " }, ctx);
  assertEquals(out, { data: reply });
  assertEquals(
    calls[0].url,
    "https://production-sfo.browserless.io/crawl?status=completed&limit=5&cursor=abc",
  );
});

Deno.test("crawl-list: no filters means a bare GET", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await crawlList.execute({}, ctx);
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/crawl");
  assertEquals(calls[0].method, "GET");
});
