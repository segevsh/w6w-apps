import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-create.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("job-create: POSTs the job with its first appointment and technicians", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, jobNumber: "J-5" } }], conn);
  await action.execute!(
    {
      customerId: 1,
      locationId: 2,
      businessUnitId: 3,
      jobTypeId: 4,
      campaignId: 5,
      priority: "High",
      appointmentStart: "2026-02-01T09:00:00Z",
      appointmentEnd: "2026-02-01T11:00:00Z",
      technicianIds: "8, 9",
      summary: "Replace unit",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.servicetitan.io/jpm/v2/tenant/42/jobs");
  assertEquals(JSON.parse(calls[0].body!), {
    customerId: 1,
    locationId: 2,
    businessUnitId: 3,
    jobTypeId: 4,
    campaignId: 5,
    priority: "High",
    appointments: [{
      start: "2026-02-01T09:00:00Z",
      end: "2026-02-01T11:00:00Z",
      technicianIds: [8, 9],
    }],
    summary: "Replace unit",
  });
  assertEquals(action.idempotent, false);
});
