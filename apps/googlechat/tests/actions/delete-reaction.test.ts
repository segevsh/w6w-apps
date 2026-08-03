import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-reaction.ts";

Deno.test("delete-reaction: DELETEs the three-level reaction resource name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ space: "A1", message: "B1.B1", reaction: "R1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/B1.B1/reactions/R1");
});

Deno.test("delete-reaction: a full reaction resource name overrides the other two fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    space: "IGNORED",
    message: "ALSO-IGNORED",
    reaction: "spaces/A9/messages/B9/reactions/R9",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/messages/B9/reactions/R9");
});

Deno.test("delete-reaction: returns the success sentinel for an Empty body", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(
    await action.execute!({ space: "A1", message: "B1", reaction: "R1" }, ctx),
    { success: true },
  );
});
