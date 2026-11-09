import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { TrelloClient } from "./client.ts";

/**
 * Trello webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a webhook on one model (board, list or card) pointed at the host's
 *     `callbackUrl`, and keeps that URL in the subscription state: Trello's signature covers it.
 *     Trello probes the URL with an HTTP HEAD request while creating the webhook and refuses to
 *     create it unless that answers 200, so `handleIngest` acknowledges GET/HEAD with no events.
 *   - `handleIngest` verifies `X-Trello-Webhook` (base64 HMAC-SHA1 of the raw body followed by
 *     the callback URL exactly as registered, keyed by the Power-Up's secret) before it parses
 *     anything. The secret is not on the connection, so the user pastes it as `signingSecret`.
 *   - `onUnsubscribe` deletes the webhook; one Trello no longer has counts as deleted.
 *
 * Docs (verified 2026-11-09):
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */

export interface TriggerParams {
  modelId?: string;
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  callbackUrl: string;
  modelId: string;
}

/** The run's `trigger.event`: one Trello action. */
export interface CardEvent {
  actionId: string | null;
  type: string;
  date: string | null;
  memberId: string | null;
  memberName: string | null;
  boardId: string | null;
  boardName: string | null;
  cardId: string | null;
  cardName: string | null;
  listId: string | null;
  listName: string | null;
  listBeforeId: string | null;
  listAfterId: string | null;
  text: string | null;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "actionId", type: "string", label: "Action ID" },
  { key: "type", type: "string", label: "Action type" },
  { key: "date", type: "string", label: "Action time" },
  { key: "memberId", type: "string", label: "Member ID" },
  { key: "memberName", type: "string", label: "Member" },
  { key: "boardId", type: "string", label: "Board ID" },
  { key: "boardName", type: "string", label: "Board" },
  { key: "cardId", type: "string", label: "Card ID" },
  { key: "cardName", type: "string", label: "Card" },
  { key: "listId", type: "string", label: "List ID" },
  { key: "listName", type: "string", label: "List" },
  { key: "listBeforeId", type: "string", label: "Moved from list ID" },
  { key: "listAfterId", type: "string", label: "Moved to list ID" },
  { key: "text", type: "string", label: "Comment text" },
];

export const EVENT_SAMPLE: CardEvent = {
  actionId: "5f0a1b2c3d4e5f6a7b8c9d0e",
  type: "createCard",
  date: "2026-11-09T10:00:00.000Z",
  memberId: "4ee7e707e582acdec80000ae",
  memberName: "Ada Lovelace",
  boardId: "4d5ea62fd76aa1136000000c",
  boardName: "Roadmap",
  cardId: "5f0a1b2c3d4e5f6a7b8c9d0f",
  cardName: "Write the spec",
  listId: "5f0a1b2c3d4e5f6a7b8c9d10",
  listName: "To do",
  listBeforeId: null,
  listAfterId: null,
  text: null,
};

const PARAMS: Param[] = [
  {
    key: "modelId",
    label: "Board, list or card ID",
    type: "string",
    required: true,
    hint: "The Trello model to watch. A board ID watches every card on it.",
  },
  {
    key: "signingSecret",
    label: "Power-Up secret",
    type: "secret",
    required: true,
    hint:
      "The secret of the Trello Power-Up (API key) that owns the connection's token, from its Trello Auth tab at trello.com/power-ups/admin. Trello signs every delivery with it.",
  },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** TrelloClient throws `Trello <status> …`; a 404/410 means the webhook is already gone. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Trello (404|410) /.test(err.message);
}

/** One Trello action → the run's event. */
export function normalizeAction(action: Record<string, unknown>): CardEvent {
  const data = asObject(action.data);
  const member = asObject(action.memberCreator);
  return {
    actionId: str(action.id),
    type: str(action.type) ?? "",
    date: str(action.date),
    memberId: str(action.idMemberCreator) ?? str(member?.id),
    memberName: str(member?.fullName) ?? str(member?.username),
    boardId: str(asObject(data?.board)?.id),
    boardName: str(asObject(data?.board)?.name),
    cardId: str(asObject(data?.card)?.id),
    cardName: str(asObject(data?.card)?.name),
    listId: str(asObject(data?.list)?.id),
    listName: str(asObject(data?.list)?.name),
    listBeforeId: str(asObject(data?.listBefore)?.id),
    listAfterId: str(asObject(data?.listAfter)?.id),
    text: str(data?.text),
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Accept an action: its `type` and its `data`. */
  match(type: string, data: Record<string, unknown>): boolean;
}

/** Build one Trello webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, CardEvent, Partial<TriggerState>> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: EVENT_OUTPUT,
    sample: EVENT_SAMPLE,

    async onSubscribe({ params, callbackUrl, subscriptionId }, ctx) {
      const modelId = params.modelId?.trim();
      if (!modelId) throw new Error("Set the board, list or card ID to watch.");
      // Fail now, not on the first delivery: a webhook nothing could verify is useless.
      requireSecret(params.signingSecret);
      const created = await new TrelloClient(ctx).request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        query: {
          callbackURL: callbackUrl,
          idModel: modelId,
          description: `w6w ${subscriptionId}`,
        },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Trello created the webhook but returned no id.");
      return { webhookId, callbackUrl, modelId };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str(state?.webhookId);
      if (!webhookId) return;
      try {
        await new TrelloClient(ctx).request(`/webhooks/${encodeURIComponent(webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      const method = raw.method.toUpperCase();
      // Trello's creation-time reachability probe (HEAD): nothing to verify, nothing to emit.
      if (method === "HEAD" || method === "GET") return [];
      if (method !== "POST") {
        throw new Error(`Trello delivers webhooks with POST, not ${raw.method}.`);
      }
      const secret = requireSecret(params?.signingSecret);
      const callbackUrl = state?.callbackUrl;
      if (typeof callbackUrl !== "string" || callbackUrl === "") {
        throw new Error("Trello delivery refused: this subscription has no callback URL recorded.");
      }
      const body = requireRawBody(raw);
      const signature = header(raw, "x-trello-webhook");
      if (!signature) throw new Error("Trello delivery refused: the X-Trello-Webhook is missing.");
      const expected = await hmac("SHA-1", secret, body + callbackUrl, "base64");
      if (!timingSafeEqual(expected, signature)) {
        throw new Error("Trello delivery refused: the signature does not match.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Trello delivery is not valid JSON.");
      }
      const d = asObject(parsed);
      const action = asObject(d?.action);
      if (!d || !action) throw new Error("Trello delivery has no action.");
      const webhookId = str(asObject(d.webhook)?.id);
      if (state?.webhookId && webhookId && webhookId !== state.webhookId) {
        throw new Error("Trello delivery is for another webhook, not this subscription's.");
      }
      const type = str(action.type) ?? "";
      if (!spec.match(type, asObject(action.data) ?? {})) return [];
      return [normalizeAction(action)];
    },
  };
}
