import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-search.ts";

/** The query is a PATH segment, so a `/` inside it must not split the path. */
Deno.test("conversation-search: the whole query is encoded into one path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [] } }]);
  await action.execute!({ query: "is:open url:https://x.test/a b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname.split("/").length, 4, url.pathname);
  assertEquals(
    decodeURIComponent(url.pathname),
    "/conversations/search/is:open url:https://x.test/a b",
  );
});

Deno.test("conversation-search: an empty query is refused before the wire", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ query: "  " }, ctx), Error, "query");
  assertEquals(calls.length, 0);
});

/** Search runs at 40% of the company allowance; callers need to know. */
Deno.test("conversation-search: the description warns about the tighter rate limit", () => {
  assert(action.description!.includes("40%"), action.description);
  assertEquals(action.type, "search");
});
