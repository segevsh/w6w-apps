import { assert, assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: GET /v1/src1/subscriptions/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscription: {} } }]);
  const out = await subscriptionGet.execute({ source_id: "src1", oid: "o 1" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/subscriptions/o%201");
  assertEquals(calls[0].body, null);
  assert("subscription" in out);
});

Deno.test("subscription-get: declares type read and every required param", () => {
  assertEquals(subscriptionGet.type, "read");
  const required = (subscriptionGet.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("subscription-get: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await subscriptionGet.execute({ source_id: "src1", oid: "o 1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
