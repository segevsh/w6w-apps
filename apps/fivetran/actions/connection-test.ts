import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `POST /v1/connections/{id}/test` — re-run the setup tests.
 *
 * What to call when a connection is `broken` and somebody has just fixed the
 * credentials at the source: it re-checks connectivity and permissions and
 * moves the connection out of `broken` if they now work. Without it the
 * connection stays broken until its next scheduled attempt.
 *
 * ## It is rate limited far more tightly than the rest of the API
 *
 * Setup tests have their own budget — **250 a minute and 2,500 an hour** on a
 * paid plan, and **50 an hour** on a trial. They also consume the *source
 * interaction* budget at the same time, so one test spends from two allowances.
 *
 * That is why this is not something to run on a schedule across every
 * connection. It is a repair step, called after a fix.
 *
 * The result names each test that ran and whether it passed, which is more
 * useful than the connection's single `broken` flag — "the credentials are fine
 * and the network is not" is a different Monday from the reverse.
 */
const action: ActionDefinition = {
  key: "connection-test",
  type: "perform",
  resource: "connection",
  title: "Run a connection's setup tests",
  description:
    "Re-check credentials and connectivity after fixing something at the source. Setup tests have " +
    "their own tight budget — 50 an hour on a trial — so this is a repair step, not a monitor.",
  idempotent: true,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "trustCertificates",
      label: "Trust Certificates",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Automatically trust the source's certificate during the test. Only for a source " +
        "whose certificate you have already verified by other means.",
    },
  ],
  output: [
    { key: "setup_tests", type: "array", label: "Each test and its outcome" },
    { key: "allPassed", type: "boolean", label: "Whether every test passed" },
    { key: "failed", type: "array", label: "The tests that did not pass" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");

    const result = await new FivetranClient(ctx).request<{
      setup_tests?: Array<{ title?: string; status?: string; message?: string }>;
    }>(`/v1/connections/${encodeURIComponent(connectionId)}/test`, {
      method: "POST",
      body: p.trustCertificates === true ? { trust_certificates: true } : {},
    });

    const tests = result?.setup_tests ?? [];
    const failed = tests.filter((t) => String(t?.status ?? "").toUpperCase() !== "PASSED");
    ctx.log("info", "ran Fivetran setup tests", {
      connectionId,
      tests: tests.length,
      failed: failed.length,
    });

    return { ...result, allPassed: tests.length > 0 && failed.length === 0, failed };
  },
};

export default action;
