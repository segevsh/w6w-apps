import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checklist-create.ts";

test("checklist-create: POSTs /cards/{id}/checklists", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cl1" } }]);
  await action.execute({ cardId: "c1", name: "Steps" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/checklists");
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "Steps");
});
