/**
 * How much credit is left — a **real** reading, which is rarer than it should
 * be.
 *
 * `GET /v1/projects/{id}/balances` returns each of a project's balances with an
 * `amount` and a `units` field. Deepgram bills pre-paid credit on the
 * pay-as-you-go plan, so this is genuine headroom rather than a rate limit: the
 * number that reaches zero and stops transcription working.
 *
 * That makes the low-water mark meaningful in a way a request-per-minute figure
 * is not. **Running out of credit does not degrade — it stops.** The threshold
 * here is deliberately generous for that reason, since noticing at 10% of a
 * balance is noticing a week early rather than an hour late.
 *
 * ## What it cannot see
 *
 * An enterprise contract is invoiced rather than pre-paid, and reports no
 * balance at all. That is not a fault, and is reported as `unknown` with the
 * reason — the alternative, treating "no balance" as "no credit", would page
 * somebody about a healthy account every interval.
 *
 * Concurrency, Deepgram's *other* limit, is a separate check — see
 * `concurrency.ts`.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { BASE_URL, projectIdFromConnection } from "../lib/client.ts";

/** Below this fraction of the largest balance seen, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit remaining",
  description:
    "The project's pre-paid balance — genuine headroom rather than a rate limit, because running " +
    "out does not slow transcription down, it stops it.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    let projectId: string;
    try {
      projectId = projectIdFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no project id recorded" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/v1/projects/${encodeURIComponent(projectId)}/balances`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach Deepgram: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // A key without `usage:read` cannot see this, and that is not an outage.
      return {
        state: "unknown",
        message: "this key may not read balances — Deepgram scopes keys, and the scope is fixed " +
          "when the key is created",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the balances endpoint returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { balances?: Array<{ balance_id?: string; amount?: number; units?: string }> }
      | null;
    const balances = body?.balances ?? [];
    if (balances.length === 0) {
      // Invoiced accounts have no balance. Reporting zero credit would be wrong.
      return {
        state: "unknown",
        message: "this project has no pre-paid balance — normal on an invoiced enterprise " +
          "contract, where there is no number to run out of",
      };
    }

    const quotas: HealthQuota[] = balances.map((b, i) => ({
      id: String(b.balance_id ?? `balance-${i}`),
      remaining: Number(b.amount ?? 0),
      unit: String(b.units ?? "credit"),
    }));
    const total = quotas.reduce((sum, q) => sum + (q.remaining ?? 0), 0);
    const largest = Math.max(...quotas.map((q) => q.remaining ?? 0));
    const summary = quotas
      .map((q) => `${(q.remaining ?? 0).toFixed(2)} ${q.unit}`)
      .join(", ");

    if (total <= 0) {
      return {
        state: "down",
        message: `no credit left (${summary}) — requests will be refused, not slowed`,
        quota: quotas,
      };
    }
    if (largest > 0 && total / largest < LOW_WATER) {
      return { state: "degraded", message: `running low — ${summary}`, quota: quotas };
    }
    return { state: "ok", message: summary, quota: quotas, ttlSeconds: 900 };
  },
};

export default quota;
