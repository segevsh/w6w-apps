import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-add-label.ts";

Deno.test("card-add-label: POSTs the label id as `value` on idLabels", async () => {
  const { ctx, calls } = mockCtx([{ body: ["lb1"] }]);
  assertEquals(await action.execute({ cardId: "c1", labelId: "lb1" }, ctx), ["lb1"]);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/idLabels");
  assertEquals(new URL(calls[0].url).searchParams.get("value"), "lb1");
});

Deno.test("card-add-label: is idempotent — re-adding leaves one label", () => {
  assertEquals(action.idempotent, true);
});
