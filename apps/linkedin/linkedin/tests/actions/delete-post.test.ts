import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-post.ts";

test("delete-post: DELETEs /rest/posts/{encoded urn} with X-RestLi-Method: DELETE", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ postUrn: "urn:li:share:123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/posts/urn%3Ali%3Ashare%3A123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["x-restli-method"], "DELETE");
  assertEquals(out, { deleted: true });
});

test("delete-post: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
