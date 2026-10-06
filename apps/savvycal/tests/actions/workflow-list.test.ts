import { assertEquals } from "@std/assert";
import workflowList from "../../actions/workflow-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workflow-list: GET /v1/workflows with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "wf_1", name: "Reminder" }]) }]);
  const out = await workflowList.execute({ limit: 3, before: "b" }, ctx) as { entries: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/workflows");
  assertEquals(queryOf(calls[0].url), { limit: "3", before: "b" });
  assertEquals(out.entries.length, 1);
});
