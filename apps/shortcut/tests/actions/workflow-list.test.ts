import { assertEquals } from "@std/assert";
import workflowList from "../../actions/workflow-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-list: calls GET /workflows", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Engineering" }] }]);
  const out = await workflowList.execute({}, ctx) as Array<{ name: string }>;

  assertEquals(pathOf(calls[0].url), "/api/v3/workflows");
  assertEquals(out[0].name, "Engineering");
});
