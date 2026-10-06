import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-get.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("job-get: GETs /jpm/v2/tenant/{t}/jobs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, jobNumber: "J-5" } }], conn);
  const out = await action.execute!({ id: 5 }, ctx) as { jobNumber: string };
  assertEquals(calls[0].url, "https://api.servicetitan.io/jpm/v2/tenant/42/jobs/5");
  assertEquals(out.jobNumber, "J-5");
});

Deno.test("job-get: the integration environment targets the integration host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5 } }], {
    display: { tenantId: "42", environment: "integration" },
  });
  await action.execute!({ id: 5 }, ctx);
  assertEquals(calls[0].url, "https://api-integration.servicetitan.io/jpm/v2/tenant/42/jobs/5");
});
