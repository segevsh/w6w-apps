import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-create.ts";

Deno.test("organization-create: POSTs the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ name: "Acme" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});

Deno.test("organization-create: requires a name", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/name/.test(String(err)));
  assertEquals(calls.length, 0);
});
