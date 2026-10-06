import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-job-title.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-job-title: GETs /v5/job_title/enrich", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      cleaned_job_title: "pastry chef",
      similar_job_titles: ["chef"],
      relevant_skills: ["baking"],
    },
  }]);
  const out = await action.execute!(
    { job_title: "Pastry Chef", titlecase: true } as never,
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/job_title/enrich");
  assertEquals(Object.fromEntries(url.searchParams), {
    job_title: "Pastry Chef",
    titlecase: "true",
  });
  assertEquals(out.found, true);
  assertEquals(out.cleaned_job_title, "pastry chef");
});

Deno.test("enrich-job-title: job_title is required; 404 is found: false", async () => {
  await assertRejects(
    async () => await action.execute!({} as never, mockCtx([]).ctx),
    Error,
    "job_title is required",
  );
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  assertEquals(
    ((await action.execute!({ job_title: "zz" } as never, ctx)) as Record<string, unknown>).found,
    false,
  );
});
