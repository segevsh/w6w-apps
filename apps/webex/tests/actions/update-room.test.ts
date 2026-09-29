import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-room.ts";

Deno.test("update-room: PUTs /rooms/{roomId} with title required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", title: "New" } }]);
  await action.execute({ roomId: "r1", title: "New" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms/r1");
  assertEquals(JSON.parse(calls[0].body!), { title: "New" });
});

Deno.test("update-room: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
