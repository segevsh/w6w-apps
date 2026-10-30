import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import officeUserRemove from "../../actions/office-user-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("office-user-remove: DELETEs /office/{office_id}/user/{user_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await officeUserRemove.execute({ office_id: "1", user_id: "123" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/office/1/user/123");
});
