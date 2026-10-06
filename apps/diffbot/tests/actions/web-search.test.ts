import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/web-search.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("web-search: POSTs text as a one-element array to llm.diffbot.com", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      query: ["diffbot"],
      search_results: [
        { score: 0.93, pageUrl: "https://www.diffbot.com/", title: "Web Data", content: "…" },
        { score: 0.9, pageUrl: "https://en.wikipedia.org/wiki/Diffbot", date: "Mon, 15 Jun 2026" },
      ],
      timeMs: 167,
    },
  }]);
  const out = await run(action, { text: "diffbot", size: 2, maxTokens: 500 }, ctx);
  assertEquals(calls[0].url, "https://llm.diffbot.com/api/v1/web_search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { text: ["diffbot"], size: 2, maxTokens: 500 });
  assertEquals(calls[0].url.includes("token"), false);
  assertEquals(out.count, 2);
  assertEquals(out.timeMs, 167);
  assertEquals(out.query, ["diffbot"]);
});

Deno.test("web-search: no results is count 0; the vendor's errors array is surfaced on 400/401", async () => {
  const none = mockCtx([{ body: { query: ["x"], search_results: [], timeMs: 3 } }]);
  assertEquals((await run(action, { text: "x" }, none.ctx)).count, 0);

  const bad = mockCtx([{
    status: 400,
    body: { errors: ["query param text size must be between 1 and 5"] },
  }]);
  await assertRejects(() => run(action, { text: "x" }, bad.ctx), Error, "must be between 1 and 5");
  const unauth = mockCtx([{
    status: 401,
    body: { code: 401, message: "Missing or invalid Authorization header" },
  }]);
  await assertRejects(
    () => run(action, { text: "x" }, unauth.ctx),
    Error,
    "Missing or invalid Authorization",
  );
});
