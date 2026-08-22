import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[]) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: data.length } } },
});

Deno.test("audit-log-list: reads the recent events", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "e1", event_type: "job.update" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number; available: boolean };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/audit-logs/",
  );
  assertEquals(result.count, 1);
  assertEquals(result.available, true);
});

/**
 * Enterprise-only. A plan that will never have it should degrade rather than
 * error every hour.
 */
Deno.test("audit-log-list: a 403 reports unavailability instead of failing", async () => {
  const { ctx, logs } = mockCtx(
    [{ status: 403, body: { status: { user_message: "Forbidden" } } }],
    {
      display,
    },
  );
  const result = await action.execute!({}, ctx) as {
    available: boolean;
    count: number;
    message: string;
  };
  assertEquals(result.available, false);
  assertEquals(result.count, 0);
  assert(/Enterprise/.test(result.message), result.message);
  assert(logs.some((l) => /not available/.test(l.message)), JSON.stringify(logs));
});

Deno.test("audit-log-list: any other failure is still raised", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "500");
});

/** A monitor, not an archive — older events need dbt's separate export. */
Deno.test("audit-log-list: says it is Enterprise-only", () => {
  assert(/Enterprise-only/.test(action.description!), action.description);
});
