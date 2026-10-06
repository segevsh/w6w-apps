import { assert, assertEquals } from "@std/assert";
import planUpdate from "../../actions/plan-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-update: PUT /v1/src1/plans/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { plan: {} } }]);
  const out = await planUpdate.execute(
    { source_id: "src1", oid: "o 1", name: "x1" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/src1/plans/o%201");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { name: "x1" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert("plan" in out);
});

Deno.test("plan-update: omits unset optional body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await planUpdate.execute({ source_id: "src1", oid: "o 1", name: "x1" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body ?? "{}")).sort(), ["name"].sort());
});

Deno.test("plan-update: declares type perform and every required param", () => {
  assertEquals(planUpdate.type, "perform");
  const required = (planUpdate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["name", "oid", "source_id"]);
});

Deno.test("plan-update: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await planUpdate.execute({ source_id: "src1", oid: "o 1", name: "x1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
