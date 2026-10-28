import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-remove-label.ts";

Deno.test("card-remove-label: DELETEs the label off the card", async () => {
  const { ctx, calls } = mockCtx([{ body: { _value: null } }]);
  await action.execute({ cardId: "c1", labelId: "lb1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/idLabels/lb1");
});
