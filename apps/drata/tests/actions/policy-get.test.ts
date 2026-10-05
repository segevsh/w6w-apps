import { assert, assertEquals, assertRejects } from "@std/assert";
import policyGet from "../../actions/policy-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "policyId": 8 };

Deno.test("policy-get: GET /policies/8 returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "x" } }]);
  const out = await policyGet.execute({ ...INPUT }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/policies/8");
  assertEquals(calls[0].url.includes("?"), false, "no query unless expand is asked for");
  assertEquals(out.id, 1);
});

Deno.test("policy-get: expand goes out as repeated expand[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await policyGet.execute({ ...INPUT, ...{ "expand": ["owner", "controls"] } }, ctx);

  const wire = [["expand[]", "owner"], ["expand[]", "controls"]] as Array<[string, string]>;
  assertEquals(queryOf(calls[0].url).getAll("expand[]"), wire.map(([, v]) => v));
});

Deno.test("policy-get: a 404 surfaces Drata's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found", 3) }]);
  const err = await assertRejects(
    () => Promise.resolve(policyGet.execute({ ...INPUT }, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404"), err.message);
  assert(err.message.includes("Not found"), err.message);
});
