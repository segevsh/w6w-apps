import type { ActionDefinition } from "@w6w/types";
import { compact, isoTimestamp, VantaClient } from "../lib/client.ts";

/**
 * `POST /v1/tests/{testId}/entities/{entityId}/deactivate` — exclude one
 * resource from a test.
 *
 * ## This grants a compliance exception, and it is the only write here that
 * changes what "compliant" means
 *
 * Deactivating an entity does not fix anything. It tells Vanta to stop counting
 * that resource, so the test goes green while the underlying condition stays
 * exactly as it was. That is a legitimate and common act — a decommissioned
 * server, a test bucket that genuinely does not need encryption, a laptop
 * belonging to somebody on leave — and it is also how a compliance program
 * quietly hollows out.
 *
 * The difference between the two is entirely in the **reason** and the
 * **expiry**:
 *
 *   - Vanta requires `deactivateReason`, and it is right to. It appears in the
 *     audit trail and it is what an auditor reads. A workflow that writes
 *     "automated" has produced an exception nobody can defend.
 *   - `deactivateUntilDate` is **optional in the API and effectively required
 *     in practice**: without it the exclusion is indefinite, and an indefinite
 *     exception outlives the situation that justified it and stops appearing in
 *     any report. This action asks for a number of days and warns when none is
 *     given.
 *
 * `test-entity-list` is where the entity ids come from.
 */
const action: ActionDefinition = {
  key: "test-entity-deactivate",
  type: "perform",
  resource: "test",
  title: "Deactivate a test entity",
  description:
    "Exclude one resource from a test. This does not fix anything — the test goes green and the " +
    "condition stays. The reason goes in the audit trail, and an exception without an expiry " +
    "outlives its justification.",
  idempotent: true,
  params: [
    { key: "testId", label: "Test ID", type: "string", required: true, default: "" },
    {
      key: "entityId",
      label: "Entity ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `test-entity-list`.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      required: true,
      default: "",
      hint: "Required by Vanta, and it is what an auditor reads. Describe why this resource is " +
        "genuinely out of scope — 'automated' is an exception nobody can defend.",
    },
    {
      key: "expiresInDays",
      label: "Expires In (days)",
      type: "number",
      default: 90,
      hint: "0 means indefinitely, which is how an exception outlives the situation that " +
        "justified it and stops appearing in any report. Prefer a date you will be asked about.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Deactivated" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const testId = String(p.testId ?? "").trim();
    const entityId = String(p.entityId ?? "").trim();
    if (!testId) throw new Error("`testId` is required");
    if (!entityId) throw new Error("`entityId` is required");
    const reason = String(p.reason ?? "").trim();
    if (!reason) {
      throw new Error(
        "`reason` is required — Vanta records it in the audit trail, and an exception without a " +
          "defensible reason is worse than a failing test",
      );
    }

    const days = p.expiresInDays === undefined ? 90 : Number(p.expiresInDays);
    let until: string | undefined;
    if (Number.isFinite(days) && days > 0) {
      until = isoTimestamp(new Date(Date.now() + days * 86_400_000).toISOString(), "expiresInDays");
    } else {
      ctx.log(
        "warn",
        "deactivating a Vanta test entity indefinitely — it will stop appearing in any report",
        { testId, entityId },
      );
    }

    const client = new VantaClient(ctx);
    await client.request(
      `/tests/${encodeURIComponent(testId)}/entities/${encodeURIComponent(entityId)}/deactivate`,
      { method: "POST", body: compact({ deactivateReason: reason, deactivateUntilDate: until }) },
    );
    ctx.log("info", "deactivated a Vanta test entity", {
      testId,
      entityId,
      until: until ?? "indefinitely",
    });
    return { ok: true };
  },
};

export default action;
