import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { gqlInput, PipefyClient } from "./client.ts";

/**
 * Pipefy pipe/table webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL with the `createWebhook` GraphQL mutation for one
 *     pipe (`pipe_id`) or one database table (`table_id`) and one action (`card.create`,
 *     `card.done`, `card.move`).
 *   - `onUnsubscribe` removes it with `deleteWebhook(input: {id})`; a webhook Pipefy no longer
 *     has ("not found") counts as deleted.
 *   - `handleIngest` parses the `{ data: { action, card, ... } }` payload and drops a delivery
 *     whose action is not the one this trigger registered.
 *
 * Trust model: Pipefy's webhook documentation describes no signature, secret or timestamp on a
 * delivery, so there is nothing to verify. The callback URL the host mints for the subscription is
 * the only secret; anyone holding it can post an event. The README says so.
 *
 * Docs (verified 2026-11-10): https://developers.pipefy.com/reference/pipe-table-webhooks and
 * https://developers.pipefy.com/docs/webhooks
 */

export interface TriggerParams {
  pipeId?: string;
  tableId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
}

/** The run's `trigger.event`: one card event. */
export interface PipefyCardEvent {
  action: string;
  cardId: string | null;
  cardTitle: string | null;
  pipeId: string | null;
  phase: Record<string, unknown> | null;
  fromPhase: Record<string, unknown> | null;
  toPhase: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  data: Record<string, unknown>;
}

const PARAMS: Param[] = [
  {
    key: "pipeId",
    label: "Pipe ID",
    type: "string",
    hint: "The pipe to watch. Give either a Pipe ID or a Table ID, not both.",
  },
  {
    key: "tableId",
    label: "Table ID",
    type: "string",
    hint: "The database table to watch (its records arrive as cards).",
  },
];

const OUTPUT: OutputField[] = [
  { key: "action", type: "string", label: "Action" },
  { key: "cardId", type: "string", label: "Card ID" },
  { key: "cardTitle", type: "string", label: "Card Title" },
  { key: "pipeId", type: "string", label: "Pipe ID" },
  { key: "phase", type: "object", label: "Phase" },
  { key: "fromPhase", type: "object", label: "From Phase (moves)" },
  { key: "toPhase", type: "object", label: "To Phase (moves)" },
  { key: "user", type: "object", label: "User" },
  { key: "data", type: "object", label: "Full Payload Data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function idStr(v: unknown): string | null {
  return typeof v === "string" && v !== ""
    ? v
    : typeof v === "number" && Number.isFinite(v)
    ? String(v)
    : null;
}

/** True for the "no such webhook" answer `PipefyClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /resource_not_found|not found/i.test(err.message);
}

/** The pipe or table the user chose, as the `createWebhook` argument. */
export function chooseRepo(params: TriggerParams | undefined): Record<string, string> {
  const pipe = params?.pipeId?.trim();
  const table = params?.tableId?.trim();
  if (pipe && table) throw new Error("Give a Pipe ID or a Table ID, not both.");
  if (pipe) return { pipe_id: pipe };
  if (table) return { table_id: table };
  throw new Error("Give the Pipe ID or the Table ID to watch.");
}

/** The parsed delivery → its event, or null when it is another action's delivery. */
export function normalizeDelivery(body: unknown, action: string): PipefyCardEvent | null {
  const data = asObject(asObject(body)?.data);
  if (!data) throw new Error("Not a Pipefy webhook delivery: expected a data object.");
  const got = typeof data.action === "string" ? data.action : null;
  if (!got) throw new Error("Not a Pipefy webhook delivery: expected an action.");
  if (got !== action) return null;
  const card = asObject(data.card);
  return {
    action: got,
    cardId: idStr(card?.id),
    cardTitle: typeof card?.title === "string" ? card.title : null,
    pipeId: idStr(card?.pipe_id),
    phase: asObject(data.on_phase),
    fromPhase: asObject(data.from),
    toPhase: asObject(data.to),
    user: asObject(data.created_by) ?? asObject(data.done_by) ?? asObject(data.moved_by),
    data,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Pipefy webhook action this trigger registers for. */
  action: string;
  sample: PipefyCardEvent;
}

/** Build one Pipefy card-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, PipefyCardEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const repo = chooseRepo(params);
      const input = gqlInput({
        actions: [spec.action],
        name: `w6w ${spec.title}`,
        ...repo,
        url: callbackUrl,
      });
      const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
        `mutation { createWebhook(input: ${input}) { webhook { id actions url } } }`,
      );
      const webhook = asObject(asObject(data.createWebhook)?.webhook);
      const id = idStr(webhook?.id);
      if (!id) throw new Error("Pipefy created the webhook but returned no id.");
      return { webhookId: id };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = idStr((state as Partial<TriggerState> | undefined)?.webhookId);
      if (!id) return;
      try {
        await new PipefyClient(ctx).send(
          `mutation { deleteWebhook(input: ${gqlInput({ id })}) }`,
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Pipefy delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = normalizeDelivery(raw.body, spec.action);
      return event ? [event] : [];
    },
  };
}
