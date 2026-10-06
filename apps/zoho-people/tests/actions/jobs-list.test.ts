import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/jobs-list.ts";

Deno.test("jobs-list: GETs getjobs with filters", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ jobId: "1", jobName: "Build" }], status: 0 } },
  }]);
  const out = await action.execute({
    assignedTo: "all",
    jobStatus: "in-progress",
    projectId: "9",
    limit: 10,
  }, ctx) as { result: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/timetracker/getjobs");
  assertEquals(url.searchParams.get("assignedTo"), "all");
  assertEquals(url.searchParams.get("jobStatus"), "in-progress");
  assertEquals(url.searchParams.get("projectId"), "9");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(out.result.length, 1);
});

Deno.test("jobs-list: requires assignedTo; time-tracker errors arrive as an array", async () => {
  const { ctx } = mockPeopleCtx([{
    status: 400,
    body: {
      response: { errors: [{ code: 9005, message: "Time tracker tab is disabled" }], status: 1 },
    },
  }]);
  await assertRejects(
    () => action.execute({ assignedTo: "" }, ctx) as Promise<unknown>,
    Error,
    "assignedTo",
  );
  await assertRejects(
    () => action.execute({ assignedTo: "all" }, ctx) as Promise<unknown>,
    Error,
    "9005",
  );
});
