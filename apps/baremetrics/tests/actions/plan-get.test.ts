import { assert, assertEquals } from "@std/assert";
import planGet from "../../actions/plan-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-get: GET /v1/src1/plans/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { plan: {} } }]);
  const out = await planGet.execute({ source_id: "src1", oid: "o 1" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/plans/o%201");
  assertEquals(calls[0].body, null);
  assert("plan" in out);
});

Deno.test("plan-get: declares type read and every required param", () => {
  assertEquals(planGet.type, "read");
  const required = (planGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("plan-get: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await planGet.execute({ source_id: "src1", oid: "o 1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
