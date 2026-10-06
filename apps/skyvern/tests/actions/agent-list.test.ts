import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";
import agentList from "../../actions/agent-list.ts";

Deno.test("agent-list: maps filters onto /v1/agents query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ workflow_permanent_id: "wpid_1" }] }]);
  const out = await agentList.execute({
    page: 1,
    pageSize: 5,
    searchKey: "login",
    status: ["published", "draft"],
    folderId: "fld_1",
    onlyWorkflows: true,
    onlyTemplates: false,
  }, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/v1/agents");
  assertEquals(queryAll(calls[0].url, "status"), ["published", "draft"]);
  const q = queryOf(calls[0].url);
  assertEquals(
    [q.page, q.page_size, q.search_key, q.folder_id, q.only_workflows, q.only_templates],
    ["1", "5", "login", "fld_1", "true", "false"],
  );
});
