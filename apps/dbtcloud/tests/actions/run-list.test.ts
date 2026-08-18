import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

/** Filtering to the in-flight states before triggering avoids a second run. */
Deno.test("run-list: the in-flight state maps to the three unfinished status numbers", async () => {
  const { ctx, calls } = mockCtx([page([{ id: 1, status: 3 }])], { display });
  const result = await action.execute!({ state: "in-flight" }, ctx) as {
    runs: Array<{ statusName: string }>;
  };
  assertEquals(new URL(calls[0].url).searchParams.get("status__in"), "1,2,3");
  assertEquals(result.runs[0].statusName, "Running");
});

Deno.test("run-list: the finished and single-status filters send the right numbers", async () => {
  for (const [state, expected] of [["finished", "10,20,30"], ["error", "20"], ["success", "10"]]) {
    const { ctx, calls } = mockCtx([page([])], { display });
    await action.execute!({ state }, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get("status__in"), expected, state);
  }
});

Deno.test("run-list: any state sends no status filter at all", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ state: "all" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status__in"), null);
});

/** "What broke last night" is the more common question. */
Deno.test("run-list: defaults to newest first", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("order_by"), "-id");
});

Deno.test("run-list: the job and project filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ jobId: "9", projectId: "3" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("job_definition_id"), "9");
  assertEquals(q.get("project_id"), "3");
});

Deno.test("run-list: reports how many matched, not just how many came back", async () => {
  const { ctx } = mockCtx([page([{ id: 1, status: 10 }], 940)], { display });
  const result = await action.execute!({ limit: 1 }, ctx) as {
    count: number;
    totalCount: number;
  };
  assertEquals(result.count, 1);
  assertEquals(result.totalCount, 940);
});

Deno.test("run-list: says why the in-flight filter is worth using", () => {
  assert(/second concurrent run/.test(action.description!), action.description);
});
