import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { MondayClient } from "./client.ts";

/**
 * monday.com webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a board webhook with the GraphQL `create_webhook` mutation.
 *     monday first POSTs `{ "challenge": "<token>" }` to the URL and wants the token echoed back;
 *     `handleIngest` answers that with `{ events: [], response }` (D8 seam) and starts no run.
 *   - `onUnsubscribe` runs `delete_webhook`; a webhook monday no longer has counts as deleted.
 *   - Trust model: monday does NOT sign ordinary webhooks. Only a webhook created with an
 *     integration-app token carries a JWT in the `Authorization` header (checked against that
 *     app's Signing Secret); the user token / OAuth connection this app uses creates unsigned
 *     webhooks. The unguessable callback URL of the subscription is therefore the only secret.
 *     The challenge proves nothing about the sender and is answered on any body that has one.
 *
 * Docs (verified 2026-11-10): https://developer.monday.com/api-reference/docs/webhooks
 */

export interface TriggerParams {
  boardId: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  boardId: string;
  webhookId: string;
}

/** The run's `trigger.event`: one board event. */
export interface BoardEvent {
  type: string | null;
  boardId: string | null;
  itemId: string | null;
  itemName: string | null;
  groupId: string | null;
  columnId: string | null;
  columnTitle: string | null;
  columnType: string | null;
  value: unknown;
  previousValue: unknown;
  userId: string | null;
  triggerTime: string | null;
  subscriptionId: string | null;
  triggerUuid: string | null;
  columnValues: Record<string, unknown>;
}

const BOARD_PARAM: Param = {
  key: "boardId",
  label: "Board ID",
  type: "string",
  required: true,
  hint:
    "The board to watch: the number in its URL (monday.com/boards/<id>) or from Get Many Boards.",
};

const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event Type" },
  { key: "boardId", type: "string", label: "Board ID" },
  { key: "itemId", type: "string", label: "Item ID" },
  { key: "itemName", type: "string", label: "Item Name" },
  { key: "groupId", type: "string", label: "Group ID" },
  { key: "columnId", type: "string", label: "Column ID" },
  { key: "columnTitle", type: "string", label: "Column Title" },
  { key: "columnType", type: "string", label: "Column Type" },
  { key: "value", type: "object", label: "New Column Value" },
  { key: "previousValue", type: "object", label: "Previous Column Value" },
  { key: "userId", type: "string", label: "User ID" },
  { key: "triggerTime", type: "string", label: "Trigger Time" },
  { key: "subscriptionId", type: "string", label: "monday Webhook ID" },
  { key: "triggerUuid", type: "string", label: "Trigger UUID" },
  { key: "columnValues", type: "object", label: "Column Values" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a monday webhook delivery. */
export function normalizeDelivery(body: unknown): BoardEvent {
  const e = asObject(asObject(body)?.event);
  if (!e) throw new Error("Not a monday webhook delivery: expected `event`.");
  return {
    type: str(e.type),
    boardId: str(e.boardId),
    itemId: str(e.itemId) ?? str(e.pulseId),
    itemName: str(e.pulseName),
    groupId: str(e.groupId),
    columnId: str(e.columnId),
    columnTitle: str(e.columnTitle),
    columnType: str(e.columnType),
    value: e.value ?? null,
    previousValue: e.previousValue ?? null,
    userId: str(e.userId),
    triggerTime: str(e.triggerTime),
    subscriptionId: str(e.subscriptionId),
    triggerUuid: str(e.triggerUuid),
    columnValues: asObject(e.columnValues) ?? {},
  };
}

/** The URL-verification probe: a JSON object whose `challenge` is a short string. */
export function challengeOf(body: unknown): string | null {
  const c = asObject(body)?.challenge;
  return typeof c === "string" && c !== "" && c.length <= 512 ? c : null;
}

/** True for the "no such webhook" answers `MondayClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /not found|does not exist|doesn't exist/i.test(err.message);
}

const CREATE = `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
  create_webhook(board_id: $boardId, url: $url, event: $event) { id board_id }
}`;

const DELETE = `mutation ($id: ID!) { delete_webhook(id: $id) { id } }`;

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The `WebhookEventType` to subscribe to. */
  event: "create_item" | "change_column_value";
  /** The `event.type` monday puts in a delivery of that subscription. */
  deliveryTypes: string[];
  sample: BoardEvent;
}

/** Build one monday board-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, BoardEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [BOARD_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const boardId = params.boardId?.trim();
      if (!boardId) throw new Error("Choose the monday board to watch.");
      const data = await new MondayClient(ctx).query<
        { create_webhook?: { id?: string | number } | null }
      >(CREATE, { boardId, url: callbackUrl, event: spec.event });
      const id = data.create_webhook?.id;
      if (id === undefined || id === null) throw new Error("monday did not return a webhook id.");
      return { boardId, webhookId: String(id) };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new MondayClient(ctx).query(DELETE, { id: s.webhookId });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`monday delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = asObject(raw.body);
      if (!body) throw new Error("monday delivery refused: the body is not a JSON object.");
      const challenge = challengeOf(body);
      if (challenge !== null && body.event === undefined) {
        return {
          events: [],
          response: {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ challenge }),
          },
        };
      }
      const event = normalizeDelivery(body);
      if (event.type === null || !spec.deliveryTypes.includes(event.type)) return [];
      return [event];
    },
  };
}
