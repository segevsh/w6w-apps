import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { header, randomSecret, requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";
import { gqlInput, PipefyClient } from "./client.ts";

/**
 * Pipefy pipe/table webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL with the `createWebhook` GraphQL mutation for one
 *     pipe (`pipe_id`) or one database table (`table_id`) and one action (`card.create`,
 *     `card.done`, `card.move`).
 *   - `onUnsubscribe` removes it with `deleteWebhook(input: {id}) { success }`; a webhook Pipefy
 *     no longer has ("not found" in a GraphQL error) counts as deleted.
 *   - `handleIngest` parses the `{ data: { action, card, ... } }` payload and drops a delivery
 *     whose action is not the one this trigger registered.
 *
 * Trust model: Pipefy documents no signature and no timestamp on a delivery, but `CreateWebhookInput`
 * has `headers: Json` ("the webhook custom JSON headers", a JSON-encoded string), sent with every
 * delivery. So `onSubscribe` registers a fresh `randomSecret()` as the `X-W6W-Webhook-Secret` header
 * (kept in subscription state; the host does not redact a custom header in stored events) and `handleIngest`
 * compares it in constant time before parsing (D5 (1)). It is a shared secret, not a signature: it
 * does not prove the body is unmodified and a captured delivery can be replayed.
 *
 * Docs (verified 2026-11-10): https://developers.pipefy.com/reference/pipe-table-webhooks and
 * https://developers.pipefy.com/docs/webhooks
 */

/** Custom delivery header carrying the per-subscription secret. */
const SECRET_HEADER = "X-W6W-Webhook-Secret";

export interface TriggerParams {
  pipeId?: string;
  tableId?: string;
  /** Any-event trigger only: comma-separated Pipefy webhook actions; empty = every card event. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  /** The shared secret registered as the `X-W6W-Webhook-Secret` delivery header. */
  secret: string;
  /** Any-event trigger only: the actions this webhook was registered for. */
  actions?: string[];
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
  /** `card.field_update` only. */
  field?: Record<string, unknown> | null;
  newValue?: unknown;
  /** `card.comment_create` only. */
  comment?: string;
  mentionedUsers?: unknown[];
  data: Record<string, unknown>;
}

/** Every webhook action Pipefy documents (https://developers.pipefy.com/reference/pipe-table-webhooks). */
export const PIPEFY_ACTIONS = [
  "card.create",
  "card.field_update",
  "card.move",
  "card.done",
  "card.delete",
  "card.comment_create",
  "card.email_received",
  "card.late",
  "card.overdue",
  "card.expired",
  "audit_log.export_finished",
  "automation.execution",
] as const;

/** What an empty `events` registers: the card/record events (not the one-per-pipe or export ones). */
const DEFAULT_CARD_ACTIONS = PIPEFY_ACTIONS.slice(0, 10);
/** Pipefy: "Lateness and Expiration type webhooks will not trigger for tables". */
const NOT_FOR_TABLES = new Set(["card.late", "card.expired"]);

/** The comma-separated `events` param → the actions to register. */
export function chooseActions(events: string | undefined, isTable: boolean): string[] {
  const asked = (events ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
  if (asked.length === 0) {
    return DEFAULT_CARD_ACTIONS.filter((a) => !(isTable && NOT_FOR_TABLES.has(a)));
  }
  const known = new Set<string>(PIPEFY_ACTIONS);
  const bad = asked.filter((a) => !known.has(a));
  if (bad.length > 0) {
    throw new Error(`Unknown Pipefy webhook action(s): ${bad.join(", ")}.`);
  }
  return [...new Set(asked)];
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

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Pipefy webhook actions (card.create, card.field_update, card.move, card.done, card.delete, card.comment_create, card.email_received, card.late, card.overdue, card.expired, audit_log.export_finished, automation.execution). Leave empty for every card event.",
};

const OUTPUT: OutputField[] = [
  { key: "action", type: "string", label: "Action" },
  { key: "cardId", type: "string", label: "Card ID" },
  { key: "cardTitle", type: "string", label: "Card Title" },
  { key: "pipeId", type: "string", label: "Pipe ID" },
  { key: "phase", type: "object", label: "Phase" },
  { key: "fromPhase", type: "object", label: "From Phase (moves)" },
  { key: "toPhase", type: "object", label: "To Phase (moves)" },
  { key: "user", type: "object", label: "User" },
  { key: "field", type: "object", label: "Field (field updates)" },
  { key: "newValue", type: "string", label: "New Value (field updates)" },
  { key: "comment", type: "string", label: "Comment (comments)" },
  { key: "mentionedUsers", type: "array", label: "Mentioned Users (comments)" },
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

/** True for the "no such webhook" GraphQL error; the client's own `404 Not Found` is not one. */
function isGone(err: unknown): boolean {
  return err instanceof Error &&
    /^Pipefy GraphQL error:.*(resource_not_found|not found)/is.test(err.message);
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
export function normalizeDelivery(
  body: unknown,
  action: string | readonly string[],
): PipefyCardEvent | null {
  const data = asObject(asObject(body)?.data);
  if (!data) throw new Error("Not a Pipefy webhook delivery: expected a data object.");
  const got = typeof data.action === "string" ? data.action : null;
  if (!got) throw new Error("Not a Pipefy webhook delivery: expected an action.");
  if (!(typeof action === "string" ? [action] : action).includes(got)) return null;
  const card = asObject(data.card);
  const extras: Partial<PipefyCardEvent> = {};
  if ("field" in data) extras.field = asObject(data.field);
  if ("new_value" in data) extras.newValue = data.new_value;
  if (typeof data.comment === "string") extras.comment = data.comment;
  if (Array.isArray(data.mentioned_users)) extras.mentionedUsers = data.mentioned_users;
  return {
    action: got,
    cardId: idStr(card?.id),
    cardTitle: typeof card?.title === "string" ? card.title : null,
    pipeId: idStr(card?.pipe_id),
    phase: asObject(data.on_phase),
    fromPhase: asObject(data.from),
    toPhase: asObject(data.to),
    user: asObject(data.created_by) ?? asObject(data.done_by) ?? asObject(data.moved_by) ??
      asObject(data.deleted_by) ?? asObject(data.updated_by) ?? asObject(data.made_by),
    ...extras,
    data,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The Pipefy webhook action this trigger registers for. */
  action: string;
  /** Any-event trigger: add the `events` param and register the chosen list instead of `action`. */
  anyEvent?: boolean;
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
    params: spec.anyEvent ? [...PARAMS, EVENTS_PARAM] : PARAMS,
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const repo = chooseRepo(params);
      const secret = randomSecret();
      const actions = spec.anyEvent
        ? chooseActions(params?.events, "table_id" in repo)
        : [spec.action];
      const input = gqlInput({
        actions,
        headers: JSON.stringify({ [SECRET_HEADER]: secret }),
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
      return spec.anyEvent ? { webhookId: id, secret, actions } : { webhookId: id, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = idStr((state as Partial<TriggerState> | undefined)?.webhookId);
      if (!id) return;
      try {
        const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
          `mutation { deleteWebhook(input: ${gqlInput({ id })}) { success } }`,
        );
        if (asObject(data.deleteWebhook)?.success === false) {
          throw new Error("Pipefy rejected deleteWebhook");
        }
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Pipefy delivers webhooks with POST, not ${raw.method}.`);
      }
      const secret = requireSecret((state as Partial<TriggerState> | undefined)?.secret);
      const got = header(raw, SECRET_HEADER);
      if (got === undefined || !timingSafeEqual(got, secret)) {
        throw new Error("Pipefy delivery refused: the secret header is missing or wrong.");
      }
      const accepted = spec.anyEvent
        ? (state as Partial<TriggerState>).actions ?? PIPEFY_ACTIONS
        : spec.action;
      const event = normalizeDelivery(raw.body, accepted);
      return event ? [event] : [];
    },
  };
}
