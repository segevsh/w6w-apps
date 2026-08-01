import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

Deno.test("job-get: GETs /project/{slug}/job/{number}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { job_number: 7, status: "success" } },
  ]);
  const result = await action.execute!({ projectSlug: "gh/org/repo", jobNumber: 7 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://circleci.com/api/v2/project/gh/org/repo/job/7");
  assertEquals(result, { job_number: 7, status: "success" });
});

Deno.test("job-get: requires projectSlug", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ jobNumber: 7 }, ctx)),
    Error,
    "projectSlug",
  );
});

Deno.test("job-get: requires jobNumber", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ projectSlug: "gh/org/repo" }, ctx)),
    Error,
    "jobNumber",
  );
});
