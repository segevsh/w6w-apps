import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /api/v3/forms/346127/webhooks/1 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "deleted" } }]);
  const out = await action.execute({ "formId": 346127, "webhookId": 1 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks/1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "message": "deleted" });

  const hard = mockCtx([{ body: { message: "gone" } }]);
  await action.execute({ formId: 346127, webhookId: 1, hardDelete: true }, hard.ctx);
  assertEquals(queryOf(hard.calls[0].url), { hard_delete: "true" });
  const empty = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await action.execute({ formId: 346127, webhookId: 1 }, empty.ctx), {
    deleted: true,
  });
});
