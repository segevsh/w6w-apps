import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/policy-get.ts";

const D = { display: { region: "us" } };

Deno.test("policy-get: GETs by the numeric type", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", type: 3, enabled: true, data: null },
  }], D);
  const result = await action.execute({ type: "3" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/policies/3");
  assertEquals(result.typeName, "SingleOrg");
});

Deno.test("policy-get: rejects an unknown type", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({ type: 99 }, ctx));
  assertMatch((err as Error).message, /must be one of/);
});
