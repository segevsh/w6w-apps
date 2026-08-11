import { assert, assertEquals } from "@std/assert";
import action from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs the subscription", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ webhookId: "w-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/w-1");
  assertEquals(out, { status: 204, deleted: true });
});

/** The v2 Webhooks API has four operations and none of them is an update. */
Deno.test("webhook-delete: records that delete-and-recreate is the only way to change one", () => {
  assert(action.description!.includes("no update endpoint"), action.description!);
  assertEquals(action.idempotent, true);
});
