import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-user-memberships.ts";

Deno.test("list-user-memberships: GETs /users/{id}/memberOf", async () => {
  const { ctx, calls } = mockCtx([{
    body: { value: [{ "@odata.type": "#microsoft.graph.group" }] },
  }]);
  const out = await action.execute({ userId: "adele@contoso.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users/adele@contoso.com/memberOf");
  assertEquals(out.value.length, 1);
});

Deno.test("list-user-memberships: documents neither $top nor $orderby, so offers neither", () => {
  const keys = action.params!.map((p) => p.key);
  assert(!keys.includes("top"));
  assert(!keys.includes("orderby"));
});

Deno.test("list-user-memberships: search uses the advanced path", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ userId: "u1", search: "displayName:Sales" }, ctx);
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});
