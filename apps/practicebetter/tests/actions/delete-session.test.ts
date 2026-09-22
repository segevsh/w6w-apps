import { assertEquals } from "@std/assert";
import action from "../../actions/delete-session.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("delete-session: DELETEs /consultant/sessions/{sessionId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute({ sessionId: "sess-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/sessions/sess-1`);
  assertEquals(result, { status: 200 });
});

Deno.test("delete-session: a 202 with no body is still a success", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(await action.execute({ sessionId: "sess-1" }, ctx), { status: 202 });
});

Deno.test("delete-session: declared idempotent, and distinct from cancelling", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.resource, "session");
  assertEquals(/cancel-session/.test(action.description!), true, action.description);
});
