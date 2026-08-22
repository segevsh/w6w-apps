import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-posting-get.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("job-posting-get: fetches one posting", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "jp1", title: "Engineer" })]);
  const result = await action.execute!({ jobPostingId: "jp1" }, ctx) as { title: string };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/jobPosting.info");
  assertEquals(JSON.parse(calls[0].body!), { jobPostingId: "jp1" });
  assertEquals(result.title, "Engineer");
});

/** Without the flag a draft's id returns nothing, which reads as deleted. */
Deno.test("job-posting-get: reaching a draft requires the explicit flag", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "jp1" })]);
  await action.execute!({ jobPostingId: "jp1", includeUnpublishedJobPostings: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeUnpublishedJobPostings, true);

  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "includeUnpublishedJobPostings")!;
  assert(/deleted posting/.test(p.hint!), p.hint);
});

Deno.test("job-posting-get: needs a posting id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "jobPostingId");
  assertEquals(calls.length, 0);
});

/** Published compensation is not necessarily the job's internal band. */
Deno.test("job-posting-get: distinguishes published compensation from the internal band", () => {
  assert(/internal band/.test(action.description!), action.description);
});
