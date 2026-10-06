import { assert, assertEquals } from "@std/assert";
import planList from "../../actions/plan-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plan-list: GET /v1/src1/plans with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { plans: [] } }]);
  const out = await planList.execute(
    { source_id: "src1", search: "x1", per_page: 5, page: 5 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/plans");
  assertEquals(queryOf(calls[0].url), { search: "x1", per_page: "5", page: "5" });

  const bare = mockCtx([{ body: {} }]);
  await planList.execute({ source_id: "src1" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("plans" in out);
});

Deno.test("plan-list: declares type search and every required param", () => {
  assertEquals(planList.type, "search");
  const required = (planList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["source_id"]);
});

Deno.test("plan-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await planList.execute({ source_id: "src1", search: "x1", per_page: 5, page: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
