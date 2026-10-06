import { assert, assertEquals } from "@std/assert";
import subscriptionDelete from "../../actions/subscription-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-delete: DELETE /v1/src1/subscriptions/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: {} } }]);
  const out = await subscriptionDelete.execute({ source_id: "src1", oid: "o 1" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/src1/subscriptions/o%201");
  assertEquals(calls[0].body, null);
  assert("result" in out);
});

Deno.test("subscription-delete: declares type perform and every required param", () => {
  assertEquals(subscriptionDelete.type, "perform");
  const required = (subscriptionDelete.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("subscription-delete: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await subscriptionDelete.execute({ source_id: "src1", oid: "o 1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
