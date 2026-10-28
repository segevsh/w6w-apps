import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-message.ts";

Deno.test("move-message: POSTs destinationId to /move", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "new-id", parentFolderId: "f2", subject: "hi" },
  }]);
  const out = await action.execute({ messageId: "m1", destinationId: "archive" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1/move");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { destinationId: "archive" });
  // A move mints a new id — the returned one, not the one passed in.
  assertEquals((out as { id: string }).id, "new-id");
});

Deno.test("move-message: is not idempotent — the source id stops resolving", () => {
  assertEquals(action.idempotent, false);
});
