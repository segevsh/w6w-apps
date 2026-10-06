import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("job-list: GETs /jpm/v2/tenant/{t}/jobs with status, technician and window filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!(
    {
      jobStatus: "InProgress",
      technicianId: 8,
      appointmentStartsOnOrAfter: "2026-02-01T00:00:00Z",
      pageSize: 10,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.servicetitan.io/jpm/v2/tenant/42/jobs");
  assertEquals(url.searchParams.get("jobStatus"), "InProgress");
  assertEquals(url.searchParams.get("technicianId"), "8");
  assertEquals(url.searchParams.get("appointmentStartsOnOrAfter"), "2026-02-01T00:00:00Z");
  assertEquals(url.searchParams.get("pageSize"), "10");
});
