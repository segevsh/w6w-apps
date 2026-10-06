import { assert, assertEquals } from "@std/assert";
import smsDelete from "../../actions/sms-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "ids": "77150850625, 77150850626" } as Parameters<typeof smsDelete.execute>[0];

Deno.test("sms-delete: DELETE /api/sms with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "deleted": ["77150850625", "77150850626"] },
  }]);
  const out = await smsDelete.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/sms");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "ids": [77150850625, 77150850626] });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out.deleted, ["77150850625", "77150850626"]);
});

Deno.test("sms-delete: declares type perform and every required param", () => {
  const required = (smsDelete.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["ids"]);
  assert(["read", "search", "perform"].includes(smsDelete.type));
  assertEquals(smsDelete.type, "perform");
});

Deno.test("sms-delete: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await smsDelete.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
