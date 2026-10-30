import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import officeDelete from "../../actions/office-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("office-delete: DELETEs /office/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await officeDelete.execute({ office_id: "4" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/office/4");
});
