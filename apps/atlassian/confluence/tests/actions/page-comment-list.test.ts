import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-comment-list.ts";

const display = { site: "acme" };

Deno.test("page-comment-list: reads the footer thread, not inline comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "c1" }], _links: {} } }], {
    display,
  });
  const result = await action.execute!({ pageId: "1" }, ctx);
  // Confluence keeps footer and inline comments at different endpoints; this
  // is the discussion thread at the bottom of the page.
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages/1/footer-comments");
  assertEquals(result, [{ id: "c1" }]);
});

Deno.test("page-comment-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
