import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checklist-get.ts";

Deno.test("checklist-get: GETs /checklists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cl1", checkItems: [] } }]);
  await action.execute({ id: "cl1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/checklists/cl1");
});
