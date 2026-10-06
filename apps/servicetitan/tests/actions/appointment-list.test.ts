import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("appointment-list: GETs /jpm/v2/tenant/{t}/appointments by job and status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!(
    { jobId: 5, status: "Scheduled", startsBefore: "2026-03-01T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.servicetitan.io/jpm/v2/tenant/42/appointments",
  );
  assertEquals(url.searchParams.get("jobId"), "5");
  assertEquals(url.searchParams.get("status"), "Scheduled");
  assertEquals(url.searchParams.get("startsBefore"), "2026-03-01T00:00:00Z");
});
