import { assert, assertEquals } from "@std/assert";
import planDelete from "../../actions/plan-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-delete: DELETE /v1/src1/plans/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: {} } }]);
  const out = await planDelete.execute({ source_id: "src1", oid: "o 1" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/src1/plans/o%201");
  assertEquals(calls[0].body, null);
  assert("result" in out);
});

Deno.test("plan-delete: declares type perform and every required param", () => {
  assertEquals(planDelete.type, "perform");
  const required = (planDelete.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("plan-delete: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await planDelete.execute({ source_id: "src1", oid: "o 1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
