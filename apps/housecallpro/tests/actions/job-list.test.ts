import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { mockCtx, optionValues, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("job-list: calls GET /jobs and folds the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page("jobs", [{ id: "j1" }]) }]);
  const out = await jobList.execute({ customerId: "c1", page: 2, pageSize: 25 }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs");
  assertEquals(queryOf(calls[0].url), { customer_id: "c1", page: "2", page_size: "25" });
  assertEquals(out.items, [{ id: "j1" }]);
});

Deno.test("job-list: array filters travel as repeated bracketed keys", async () => {
  const { ctx, calls } = mockCtx([{ body: page("jobs", []) }]);
  await jobList.execute({
    workStatus: ["scheduled", "in_progress"],
    employeeIds: "e1,e2",
    expand: ["appointments"],
  }, ctx);

  assertEquals(queryAll(calls[0].url, "work_status[]"), ["scheduled", "in_progress"]);
  assertEquals(queryAll(calls[0].url, "employee_ids[]"), ["e1", "e2"]);
  assertEquals(queryAll(calls[0].url, "expand[]"), ["appointments"]);
});

Deno.test("job-list: offers the filter vocabulary, not the response vocabulary", () => {
  const values = optionValues(jobList.params?.find((p) => p.key === "workStatus"));
  assertEquals(values, ["unscheduled", "scheduled", "in_progress", "completed", "canceled"]);
  // The response spelling would be silently accepted and match nothing.
  assertEquals(values.includes("in progress"), false);
  assertEquals(values.includes("needs scheduling"), false);
});

Deno.test("job-list: date filters map to the vendor's min/max parameter names", async () => {
  const { ctx, calls } = mockCtx([{ body: page("jobs", []) }]);
  await jobList.execute({
    scheduledStartMin: "2026-03-01T00:00:00",
    scheduledEndMax: "2026-03-31T23:59:59",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    scheduled_start_min: "2026-03-01T00:00:00",
    scheduled_end_max: "2026-03-31T23:59:59",
  });
});
