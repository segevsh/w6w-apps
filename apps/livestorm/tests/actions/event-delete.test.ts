import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventDelete from "../../actions/event-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("event-delete: DELETEs /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await eventDelete.execute({ id: "e1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
