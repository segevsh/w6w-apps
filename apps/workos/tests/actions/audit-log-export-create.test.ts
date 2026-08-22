import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-export-create.ts";

/** Both ends are required — WorkOS has no unbounded export. */
Deno.test("audit-log-export-create: requires both ends of the range", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ organizationId: "org_1", rangeStart: "2026-08-01T00:00:00Z" }, ctx),
    Error,
    "unbounded",
  );
  assertEquals(calls.length, 0);
});

Deno.test("audit-log-export-create: posts the range and returns the job id", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 201, body: { id: "audit_log_export_1" } }]);
  const result = await action.execute!({
    organizationId: "org_1",
    rangeStart: "2026-08-01T00:00:00Z",
    rangeEnd: "2026-08-18T00:00:00Z",
    actions: "user.signed_in,user.signed_out",
  }, ctx) as { id: string };
  assertEquals(calls[0].url, "https://api.workos.com/audit_logs/exports");
  assertEquals(JSON.parse(calls[0].body!), {
    organization_id: "org_1",
    range_start: "2026-08-01T00:00:00Z",
    range_end: "2026-08-18T00:00:00Z",
    actions: ["user.signed_in", "user.signed_out"],
  });
  assertEquals(result.id, "audit_log_export_1");
  assertEquals(logs[0].data, { exportId: "audit_log_export_1", organizationId: "org_1" });
});

Deno.test("audit-log-export-create: needs an organization", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ rangeStart: "2026-08-01", rangeEnd: "2026-08-18" }, ctx),
    Error,
    "organizationId",
  );
  assertEquals(calls.length, 0);
});

/** There is no endpoint that reads events back; an export is the only route. */
Deno.test("audit-log-export-create: says there is no read endpoint", () => {
  assert(/no read endpoint/.test(action.description!), action.description);
});
