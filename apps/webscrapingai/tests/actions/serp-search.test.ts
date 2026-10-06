import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/serp-search.ts";
import { mockCtx } from "../_helpers.ts";

const serp = {
  search_parameters: { engine: "google", q: "coffee", gl: "us", hl: "en", page: 1 },
  organic_results: [{ position: 1, title: "T", link: "https://x.test" }],
  pagination: { current: 1, next: 2 },
};

Deno.test("serp-search: GETs /serp with q and engine=google; optional fields only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: serp }, { body: serp }]);
  assertEquals(await action.execute({ q: "coffee" }, ctx), serp);
  const first = new URL(calls[0].url);
  assertEquals(first.pathname, "/serp");
  assertEquals([...first.searchParams.keys()].sort(), ["engine", "q"]);
  await action.execute({ q: "coffee", gl: "DE", hl: "De", page: 3 }, ctx);
  const q = new URL(calls[1].url).searchParams;
  assertEquals(q.get("gl"), "de");
  assertEquals(q.get("hl"), "de");
  assertEquals(q.get("page"), "3");
});

Deno.test("serp-search: a blank query makes no call; a 400 from the vendor is surfaced", async () => {
  const none = mockCtx();
  await assertRejects(async () => await action.execute({ q: " " }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid page" } }]);
  await assertRejects(
    async () => await action.execute({ q: "x", page: 500 }, ctx),
    Error,
    "Invalid page",
  );
});
