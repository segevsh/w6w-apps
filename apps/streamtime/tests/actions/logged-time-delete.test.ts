import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import loggedTimeDelete from "../../actions/logged-time-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("logged-time-delete: DELETEs and reports the status, not the open body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await loggedTimeDelete.execute({ loggedTimeId: 555 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/logged_times/555");
  assertEquals(result, { deleted: true, status: 200 });
});
