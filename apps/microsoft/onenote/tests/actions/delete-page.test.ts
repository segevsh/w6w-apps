import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-page.ts";

test("delete-page: DELETEs /me/onenote/pages/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ pageId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages/p1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 204);
});

test('delete-page: converges on "gone" either way — idempotent', () => {
  assertEquals(action.idempotent, true);
});
