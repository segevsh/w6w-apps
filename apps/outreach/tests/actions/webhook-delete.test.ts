import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /webhooks/{id} and report deleted on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ id: 5 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/5");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 5 });
});

Deno.test("webhook-delete: id 0 is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookDelete.execute({ id: 0 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-delete: a 422 is reported with its pointer", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      errors: [{
        id: "validationError",
        title: "Validation Error",
        detail: "Cannot be deleted.",
        source: { pointer: "/data" },
      }],
    },
  }]);
  await assertRejects(
    async () => await webhookDelete.execute({ id: 5 }, ctx),
    Error,
    "validationError: Cannot be deleted. (/data)",
  );
});
