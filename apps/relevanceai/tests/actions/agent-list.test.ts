import { assert, assertEquals, assertRejects } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-list: POSTs the search to /agents/list and returns results", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [{ agent_id: "a1" }] } }]);
  const out = await agentList.execute(
    { query: "triage", page: 2, pageSize: 5 },
    ctx,
  ) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/latest/agents/list");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { query: "triage", page: 2, page_size: 5 });
  assertEquals(out.results.length, 1);
});

Deno.test("agent-list: filters and sort are the vendor's own DSL, as JSON", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await agentList.execute(
    {
      filters: '[{"field":"insert_date_","filter_type":"date","condition":">",' +
        '"condition_value":"2026-01-01"}]',
      sort: ["-update_date_"],
    },
    ctx,
  );

  assertEquals(bodyOf(calls[0]).filters, [
    {
      field: "insert_date_",
      filter_type: "date",
      condition: ">",
      condition_value: "2026-01-01",
    },
  ]);
  assertEquals(bodyOf(calls[0]).sort, ["-update_date_"]);
});

Deno.test("agent-list: an empty body is sent when nothing is supplied", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await agentList.execute({}, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("agent-list: malformed filter JSON fails before any request is made", async () => {
  const { ctx, calls } = mockRelevanceCtx();
  await assertRejects(
    async () => await agentList.execute({ filters: "{oops" }, ctx),
    Error,
    "filters is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("agent-list: the deprecated flag is not exposed", () => {
  // `include_public_agents` is documented as DEPRECATED and ignored — offering
  // it would invite a caller to depend on a no-op.
  assertEquals(agentList.params?.map((p) => p.key), [
    "query",
    "page",
    "pageSize",
    "filters",
    "sort",
  ]);
  assert(agentList.type === "read");
});
