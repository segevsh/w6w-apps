import { assert, assertEquals } from "@std/assert";
import action from "../../actions/delete-webhook-subscription.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("delete-webhook-subscription: DELETEs /webhooks/subscription/{subscriptionId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await action.execute({ subscriptionId: "sub-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/webhooks/subscription/sub-1`);
  assertEquals(result, { status: 204, deleted: true });
});

/**
 * The point of this action: the documented success is 204 with no body, and a
 * JSON parse of that would look like a failure.
 */
Deno.test("delete-webhook-subscription: a 204 no-content success is handled explicitly", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await action.execute({ subscriptionId: "sub-1" }, ctx);
  assertEquals(result.deleted, true);
  assertEquals(calls[0].body, null);
});

Deno.test("delete-webhook-subscription: a non-204 success does not claim a no-content delete", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await action.execute({ subscriptionId: "sub-1" }, ctx), {
    status: 200,
    deleted: false,
  });
});

Deno.test("delete-webhook-subscription: declared idempotent and scoped under `read`", () => {
  assertEquals(action.idempotent, true);
  assert(/204/.test(action.description!), action.description);
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["status", "deleted"]);
});
