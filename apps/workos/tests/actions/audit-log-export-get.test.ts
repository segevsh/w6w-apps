import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-export-get.ts";

Deno.test("audit-log-export-get: reports ready as a boolean so a poll can branch", async () => {
  const pending = mockCtx([{ status: 200, body: { id: "e1", state: "pending" } }]);
  assertEquals(
    (await action.execute!({ exportId: "e1" }, pending.ctx) as { ready: boolean }).ready,
    false,
  );

  const done = mockCtx([{
    status: 200,
    body: { id: "e1", state: "ready", url: "https://files.workos.com/signed" },
  }]);
  const result = await action.execute!({ exportId: "e1" }, done.ctx) as {
    ready: boolean;
    url: string;
  };
  assertEquals(done.calls[0].url, "https://api.workos.com/audit_logs/exports/e1");
  assertEquals(result.ready, true);
  assertEquals(result.url, "https://files.workos.com/signed");
});

/**
 * The URL is a pre-signed link to a customer's complete audit trail — the most
 * sensitive thing this app can produce. Returned, never logged.
 */
Deno.test("audit-log-export-get: logs the state and not the download URL", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { state: "ready", url: "https://files.workos.com/very-secret" },
  }]);
  await action.execute!({ exportId: "e1" }, ctx);
  assert(!JSON.stringify(logs).includes("very-secret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { exportId: "e1", state: "ready" });
});

Deno.test("audit-log-export-get: needs an export id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "exportId");
  assertEquals(calls.length, 0);
});
