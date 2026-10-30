import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import policyTypes from "../../actions/timeoff-policy-types-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("timeoff-policy-types-list: GETs /v1/timeoff/policy-types", async () => {
  const { ctx, calls } = mockCtx([{ body: { policyTypes: ["Holiday", "Sick"] } }]);
  const out = await policyTypes.execute({}, ctx) as { policyTypes: string[] };
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/policy-types");
  assertEquals(out.policyTypes, ["Holiday", "Sick"]);
});
