import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-archive-all-cards.ts";

Deno.test("list-archive-all-cards: POSTs the archiveAllCards route, not /closed", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ id: "l1" }, ctx);
  assertEquals(calls[0].method, "POST");
  // /closed would archive the LIST; this action archives the cards inside it.
  assertEquals(new URL(calls[0].url).pathname, "/1/lists/l1/archiveAllCards");
});
