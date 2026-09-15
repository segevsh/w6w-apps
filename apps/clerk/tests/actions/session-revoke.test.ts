import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/session-revoke.ts";

Deno.test("session-revoke: POSTs to /sessions/{id}/revoke", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "sess_1", status: "revoked" } }]);
  await action.execute!({ sessionId: "sess_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/sessions/sess_1/revoke");
});
