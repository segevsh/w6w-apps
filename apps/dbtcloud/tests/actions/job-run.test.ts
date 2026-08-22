import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-run.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("job-run: posts the cause and returns the queued run, named", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 7, status: 1 } } }], {
    display,
  });
  const result = await action.execute!(
    { jobId: "9", cause: "Fivetran sync finished" },
    ctx,
  ) as { id: number; statusName: string };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/9/run/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { cause: "Fivetran sync finished" });
  assertEquals(result.id, 7);
  // Queued. Nothing has been built.
  assertEquals(result.statusName, "Queued");
});

/** dbt makes it mandatory, and it is what a person reads beside the run. */
Deno.test("job-run: refuses without a cause, before spending the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ jobId: "9", cause: "  " }, ctx),
    Error,
    "cause",
  );
  assertEquals(calls.length, 0);
});

Deno.test("job-run: git, step and target overrides reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 7, status: 1 } } }], {
    display,
  });
  await action.execute!({
    jobId: "9",
    cause: "backfill",
    gitBranch: "fix/orders",
    stepsOverride: "dbt seed, dbt run --select tag:hourly",
    targetNameOverride: "scratch",
    threadsOverride: 8,
    generateDocsOverride: "false",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    cause: "backfill",
    git_branch: "fix/orders",
    steps_override: ["dbt seed", "dbt run --select tag:hourly"],
    target_name_override: "scratch",
    threads_override: 8,
    generate_docs_override: false,
  });
});

/** dbt will not warn you if the override is production. */
Deno.test("job-run: a schema override is warned about", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: { id: 7, status: 1 } } }], {
    display,
  });
  await action.execute!({ jobId: "9", cause: "x", schemaOverride: "analytics" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /overridden schema/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("job-run: an unset docs override is omitted rather than sent as false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 7, status: 1 } } }], {
    display,
  });
  await action.execute!({ jobId: "9", cause: "x", generateDocsOverride: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).generate_docs_override, undefined);
});

Deno.test("job-run: needs a job id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ cause: "x" }, ctx), Error, "jobId");
});

/** A successful trigger is not a successful build, and the description says so. */
Deno.test("job-run: its description says the run is only queued", () => {
  assert(/QUEUED/.test(action.description!), action.description);
});
