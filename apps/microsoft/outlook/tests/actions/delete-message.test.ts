import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-message.ts";

Deno.test("delete-message: DELETEs the message and reports 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ messageId: "m1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { status: 204 });
});

Deno.test("delete-message: is idempotent — the end state is the same either way", () => {
  assertEquals(action.idempotent, true);
});
