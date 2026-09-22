import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-record.ts";

Deno.test("delete-record: DELETEs /applications/{tableId}/records/{recordId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ tableId: "tbl1", recordId: "rec1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/rec1/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, undefined);
});

Deno.test("delete-record: returns a JSON body when the vendor sends one", async () => {
  const { ctx } = mockCtx([{ body: { deleted: true } }]);
  assertEquals(await action.execute!({ tableId: "tbl1", recordId: "rec1" }, ctx), {
    deleted: true,
  });
});

Deno.test("delete-record: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
