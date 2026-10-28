import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-organization.ts";

Deno.test("get-organization: GETs /organization and unwraps the single entry", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      value: [{ id: "t1", displayName: "Contoso", verifiedDomains: [{ name: "contoso.com" }] }],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/organization");
  assertEquals(out.id, "t1");
  assertEquals(out.displayName, "Contoso");
});

Deno.test("get-organization: passes $select", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "t1" }] } }]);
  await action.execute({ select: ["id", "verifiedDomains"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,verifiedDomains");
});

Deno.test("get-organization: an empty collection is an error, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { value: [] } }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "no organization");
});
