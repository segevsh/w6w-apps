import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";
import runList from "../../actions/run-list.ts";

Deno.test("run-list: sends repeated status/agent keys and page params, wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ run_id: "a" }, { run_id: "b" }] }]);
  const out = await runList.execute({
    page: 2,
    pageSize: 25,
    status: ["running", "failed"],
    searchKey: "invoice",
    agentIds: "wpid_1,wpid_2",
    tags: "env:prod",
  }, ctx);
  assertEquals(out, { runs: [{ run_id: "a" }, { run_id: "b" }], count: 2 });
  assertEquals(pathOf(calls[0].url), "/v1/runs");
  assertEquals(queryAll(calls[0].url, "status"), ["running", "failed"]);
  assertEquals(queryAll(calls[0].url, "workflow_permanent_id"), ["wpid_1", "wpid_2"]);
  assertEquals(queryOf(calls[0].url).page, "2");
  assertEquals(queryOf(calls[0].url).page_size, "25");
  assertEquals(queryOf(calls[0].url).search_key, "invoice");
  assertEquals(queryOf(calls[0].url).tags, "env:prod");
});

Deno.test("run-list: no filters sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(await runList.execute({}, ctx), { runs: [], count: 0 });
  assertEquals(new URL(calls[0].url).search, "");
});
