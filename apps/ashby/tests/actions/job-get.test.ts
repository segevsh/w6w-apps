import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("job-get: expands openings by default", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "j1", title: "Engineer" })]);
  const result = await action.execute!({ jobId: "j1" }, ctx) as { title: string };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/job.info");
  assertEquals(JSON.parse(calls[0].body!), { id: "j1", expand: ["openings"] });
  assertEquals(result.title, "Engineer");
});

Deno.test("job-get: draft posting ids are opt-in", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "j1" })]);
  await action.execute!({ jobId: "j1", includeUnpublishedJobPostingsIds: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeUnpublishedJobPostingsIds, true);
});

Deno.test("job-get: needs a job id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "jobId");
  assertEquals(calls.length, 0);
});

/** Openings are what turn a job into a headcount plan. */
Deno.test("job-get: says why the openings expansion is worth having", () => {
  assert(/headcount plan/.test(action.description!), action.description);
});
