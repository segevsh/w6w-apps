import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /webhooks/{id} reports ok and the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ id: "42" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks/42");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out, { ok: true, id: "42" });
});

Deno.test("webhook-delete: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookDelete.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("webhook-delete: declares perform and idempotent=true", () => {
  assertEquals(webhookDelete.type, "perform");
  assertEquals(webhookDelete.idempotent, true);
  assertEquals(webhookDelete.key, "webhook-delete");
});
