import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-update.ts";

Deno.test("card-update: moving a card between lists is a PUT with idList", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", idList: "l2" } }]);
  await action.execute({ id: "c1", idList: "l2" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).searchParams.get("idList"), "l2");
});

Deno.test("card-update: sends dueComplete:false rather than omitting it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "c1", dueComplete: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("dueComplete"), "false");
});

Deno.test("card-update: warns that idLabels/idMembers replace rather than append", () => {
  const labels = action.params?.find((p) => p.key === "idLabels");
  const members = action.params?.find((p) => p.key === "idMembers");
  assert(labels?.hint?.includes("REPLACES"));
  assert(members?.hint?.includes("REPLACES"));
});
