import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-rerun.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

/**
 * The same call resumes a failed run OR starts a complete fresh build, decided
 * by state the caller did not check — so it is gated.
 */
Deno.test("job-rerun: refuses without the acknowledgement, and points at run-retry", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ jobId: "9" }, ctx),
    Error,
    "run-retry",
  );
  assertEquals(calls.length, 0);
});

Deno.test("job-rerun: acknowledged, it posts to the rerun path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 8, status: 1 } } }], {
    display,
  });
  const result = await action.execute!({ jobId: "9", confirmFullRebuild: true }, ctx) as {
    id: number;
    statusName: string;
  };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/9/rerun/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 8);
  assertEquals(result.statusName, "Queued");
});

Deno.test("job-rerun: needs a job id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ confirmFullRebuild: true }, ctx),
    Error,
    "jobId",
  );
});

Deno.test("job-rerun: its description names both outcomes", () => {
  assert(/SUCCEEDED/.test(action.description!), action.description);
  assert(/fresh build/.test(action.description!), action.description);
});
