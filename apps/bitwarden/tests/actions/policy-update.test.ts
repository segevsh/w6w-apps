import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/policy-update.ts";

const D = { display: { region: "us" } };

Deno.test("policy-update: PUTs enabled and data", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
      type: 1,
      enabled: true,
      data: { minLength: 14 },
    },
  }], D);
  const result = await action.execute(
    { type: 1, enabled: true, data: '{"minLength":14}' },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/policies/1");
  assertEquals(JSON.parse(calls[0].body!), { enabled: true, data: { minLength: 14 } });
  assertEquals(result.typeName, "MasterPassword");
});

Deno.test("policy-update: requires a boolean enabled", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({ type: 1 }, ctx));
  assertMatch((err as Error).message, /enabled/);
});
