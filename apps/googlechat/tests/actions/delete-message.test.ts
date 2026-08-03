import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-message.ts";

Deno.test("delete-message: DELETEs the message resource name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ space: "A1", message: "B1.B1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/B1.B1");
});

Deno.test("delete-message: returns the success sentinel for an Empty body", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await action.execute!({ space: "A1", message: "B1" }, ctx), { success: true });
});

Deno.test("delete-message: handles a 204 the same way as an empty 200", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ space: "A1", message: "B1" }, ctx), { success: true });
});

Deno.test("delete-message: force is sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }, { status: 200 }]);
  await action.execute!({ space: "A1", message: "B1", force: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("force"), "true");
  await action.execute!({ space: "A1", message: "B1" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("force"), false);
});
