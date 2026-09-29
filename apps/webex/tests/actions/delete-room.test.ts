import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-room.ts";

Deno.test("delete-room: DELETEs /rooms/{roomId} and returns deleted:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ roomId: "r1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms/r1");
  assertEquals(result, { deleted: true });
});
