import { assertEquals } from "@std/assert";
import action from "../../actions/attribute-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("attribute-list: lists global attributes without a group", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ name: "firstname" }] }]);
  const out = await action.execute({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/attributes");
  assertEquals(out.count, 1);
});

Deno.test("attribute-list: scopes to a group", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ groupId: "5" }, ctx);
  assertEquals(queryOf(calls[0].url), { group_id: "5" });
});
