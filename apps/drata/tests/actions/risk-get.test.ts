import { assert, assertEquals, assertRejects } from "@std/assert";
import riskGet from "../../actions/risk-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "riskRegisterId": 2, "riskId": "RISK-001" };

Deno.test("risk-get: GET /risk-registers/2/risks/RISK-001 returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "x" } }]);
  const out = await riskGet.execute({ ...INPUT }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/risk-registers/2/risks/RISK-001");
  assertEquals(calls[0].url.includes("?"), false, "no query unless expand is asked for");
  assertEquals(out.id, 1);
});

Deno.test("risk-get: expand goes out as repeated expand[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await riskGet.execute({ ...INPUT, ...{ "expand": ["owners"] } }, ctx);

  const wire = [["expand[]", "owners"]] as Array<[string, string]>;
  assertEquals(queryOf(calls[0].url).getAll("expand[]"), wire.map(([, v]) => v));
});

Deno.test("risk-get: a 404 surfaces Drata's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found", 3) }]);
  const err = await assertRejects(() => Promise.resolve(riskGet.execute({ ...INPUT }, ctx)), Error);
  assert(err.message.includes("HTTP 404"), err.message);
  assert(err.message.includes("Not found"), err.message);
});
