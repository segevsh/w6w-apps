import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sessionDelete from "../../actions/session-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("session-delete: DELETEs /sessions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await sessionDelete.execute({ id: "s1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
