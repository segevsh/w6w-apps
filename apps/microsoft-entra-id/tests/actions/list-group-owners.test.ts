import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-group-owners.ts";

Deno.test("list-group-owners: GETs /groups/{id}/owners", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "u1" }] } }]);
  const out = await action.execute({ groupId: "g1", top: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/groups/g1/owners");
  assertEquals(url.searchParams.get("$top"), "10");
  assertEquals(out.value.length, 1);
});

Deno.test("list-group-owners: search switches the advanced path on", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "g1", search: "displayName:A" }, ctx);
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});
