import { assert, assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 123456 } as Parameters<typeof webhookDelete.execute>[0];

Deno.test("webhook-delete: DELETE /api/hooks with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "code": null, "id": 123456, "error_message": null },
  }]);
  const out = await webhookDelete.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/hooks");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), { "id": "123456" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.id, 123456);
});

Deno.test("webhook-delete: declares type perform and every required param", () => {
  const required = (webhookDelete.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(webhookDelete.type));
  assertEquals(webhookDelete.type, "perform");
});

Deno.test("webhook-delete: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await webhookDelete.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
