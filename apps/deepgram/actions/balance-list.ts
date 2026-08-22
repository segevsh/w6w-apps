import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/balances` — how much credit is left.
 *
 * Deepgram bills pre-paid credit on the pay-as-you-go plan, and **running out
 * does not degrade anything — it stops transcription working**. That makes this
 * one of the few genuinely actionable numbers an API exposes: a workflow can
 * check it, and a scheduled job can raise a ticket a week before the queue
 * silently stops.
 *
 * The `quota` health check reads the same endpoint continuously, which is the
 * better place for monitoring. This action is for a workflow that wants to
 * branch on it — pausing a bulk transcription job rather than watching it fail
 * halfway.
 *
 * **An invoiced enterprise project has no balance**, and reports an empty list.
 * That is not zero credit, and treating it as such is the mistake this action's
 * `hasBalance` output exists to prevent.
 */
const action: ActionDefinition = {
  key: "balance-list",
  type: "read",
  resource: "balance",
  title: "List balances",
  description:
    "Remaining pre-paid credit. Running out stops transcription rather than slowing it — and an " +
    "invoiced account reports no balance at all, which is not the same as zero.",
  params: [],
  output: [
    { key: "balances", type: "array", label: "Balances" },
    { key: "total", type: "number", label: "Total remaining" },
    { key: "hasBalance", type: "boolean", label: "False on an invoiced account — not zero credit" },
  ],

  async execute(_input, ctx) {
    const client = new DeepgramClient(ctx);
    const body = await client.request<{ balances?: Array<{ amount?: number }> }>(
      `/v1/projects/${encodeURIComponent(client.projectId)}/balances`,
    );
    const balances = body?.balances ?? [];
    const total = balances.reduce((sum, b) => sum + Number(b?.amount ?? 0), 0);

    return {
      balances,
      total,
      // An empty list means "invoiced", not "out of credit".
      hasBalance: balances.length > 0,
    };
  },
};

export default action;
