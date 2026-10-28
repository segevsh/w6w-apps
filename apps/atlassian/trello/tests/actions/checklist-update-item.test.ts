import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checklist-update-item.ts";

Deno.test("checklist-update-item: PUTs through the CARD route, not the checklist", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ci1", state: "complete" } }]);
  await action.execute({ cardId: "c1", checkItemId: "ci1", state: "complete" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/checkItem/ci1");
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "complete");
});
