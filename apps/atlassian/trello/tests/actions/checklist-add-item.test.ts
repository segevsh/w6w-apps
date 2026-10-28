import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checklist-add-item.ts";

Deno.test("checklist-add-item: POSTs /checklists/{id}/checkItems", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ci1" } }]);
  await action.execute({ checklistId: "cl1", name: "Write tests" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/1/checklists/cl1/checkItems");
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "Write tests");
});
