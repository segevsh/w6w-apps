import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Notion webhook trigger (integration webhooks, manual webhook). Setup is by hand in the
 * integration's Webhooks tab: Notion first POSTs `{ "verification_token": "…" }` (unsigned, no
 * event); the user pastes that token into the trigger's `verificationToken` param and confirms the
 * subscription in Notion. Every later delivery carries `X-Notion-Signature: sha256=<hex
 * HMAC-SHA256(verification_token, exact body bytes)>`. Docs, verified 2026-11-09:
 * https://developers.notion.com/reference/webhooks
 */

/** Event types an integration webhook can deliver (Notion webhook events reference). */
export const EVENT_TYPES = [
  "page.created",
  "page.content_updated",
  "page.properties_updated",
  "page.moved",
  "page.deleted",
  "page.undeleted",
  "page.locked",
  "page.unlocked",
  "data_source.created",
  "data_source.content_updated",
  "data_source.schema_updated",
  "data_source.moved",
  "data_source.deleted",
  "data_source.undeleted",
  "comment.created",
  "comment.updated",
  "comment.deleted",
] as const;

export interface TriggerParams {
  verificationToken?: string;
  eventTypes?: string[];
}

/** What `onSubscribe` returns and the host persists: Notion is registered by hand. */
export interface TriggerState {
  callbackUrl: string;
}

export interface NotionEvent {
  id: string | null;
  type: string;
  timestamp: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  subscriptionId: string | null;
  integrationId: string | null;
  entityId: string | null;
  entityType: string | null;
  authors: unknown[];
  data: Record<string, unknown>;
  attemptNumber: number | null;
}

const VERIFICATION_PARAM: Param = {
  key: "verificationToken",
  label: "Verification Token",
  type: "secret",
  required: true,
  hint:
    "Notion sends it once in a POST to this trigger's webhook URL when you create the subscription (integration settings → Webhooks). Paste it here, then verify the subscription in Notion. Every event is checked against it.",
};

const EVENT_TYPES_PARAM: Param = {
  key: "eventTypes",
  label: "Event Types",
  type: "multiselect",
  ui: "checkboxes",
  options: EVENT_TYPES.map((t) => ({ value: t, label: t })),
  hint: "Only fire for these event types. Leave empty for every event Notion delivers.",
};

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "timestamp", type: "string", label: "Timestamp" },
  { key: "workspaceId", type: "string", label: "Workspace ID" },
  { key: "workspaceName", type: "string", label: "Workspace Name" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "integrationId", type: "string", label: "Integration ID" },
  { key: "entityId", type: "string", label: "Entity ID" },
  { key: "entityType", type: "string", label: "Entity Type (page, block, database…)" },
  { key: "authors", type: "array", label: "Authors" },
  { key: "data", type: "object", label: "Event Data" },
  { key: "attemptNumber", type: "number", label: "Delivery Attempt" },
];

const SAMPLE: NotionEvent = {
  id: "367cba44-b6f3-4c92-81e7-6a2e9a1ac1c8",
  type: "page.created",
  timestamp: "2026-11-09T12:00:00.000Z",
  workspaceId: "13950b26-c203-4f3b-b97d-93ec06319565",
  workspaceName: "Acme",
  subscriptionId: "29d75c0d-5546-4414-8459-7b7a92f1fc4b",
  integrationId: "0ef2e755-4912-8096-91c1-00376a88a5ca",
  entityId: "153104cd-477e-809d-8eb7-d9fe4c4ee1de",
  entityType: "page",
  authors: [{ id: "c7c11cca-1d73-471d-9b6e-bdef51470190", type: "person" }],
  data: { parent: { id: "59833787-2cf9-4fdf-8782-e53db20768a5", type: "database" } },
  attemptNumber: 1,
};

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function parse(body: string): Record<string, unknown> {
  let v: unknown;
  try {
    v = JSON.parse(body);
  } catch {
    throw new Error("Notion webhook refused: the body is not JSON.");
  }
  const o = obj(v);
  if (!o) throw new Error("Notion webhook refused: the body is not a JSON object.");
  return o;
}

/** Notion's one-time setup POST: exactly `{ verification_token }`, unsigned, carries no event. */
function isSetupPing(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o);
  return keys.length === 1 && keys[0] === "verification_token" &&
    typeof o.verification_token === "string";
}

export const workspaceEvent: TriggerDefinition<TriggerParams, NotionEvent, TriggerState> = {
  key: "workspace-event",
  title: "Workspace Event",
  description:
    "Fires when Notion delivers a webhook event for your integration: a page or data source created, updated, moved or deleted, or a comment added. The run gets the event type, the entity it concerns and its author.",
  params: [VERIFICATION_PARAM, EVENT_TYPES_PARAM],
  output: OUTPUT,
  sample: SAMPLE,

  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },

  onUnsubscribe() {},

  async handleIngest({ raw, params }) {
    if (String(raw.method ?? "").toUpperCase() !== "POST") {
      throw new Error(`Notion delivers webhooks with POST, not ${raw.method}.`);
    }
    const body = requireRawBody(raw);
    const given = header(raw, "x-notion-signature");
    // The setup ping has no signature and no event: acknowledge it, emit nothing. Anything else
    // unsigned falls through to the refusal below.
    if (given === undefined && isSetupPing(parse(body))) return [];
    const secret = requireSecret(params.verificationToken);
    if (typeof given !== "string" || !given.startsWith("sha256=")) {
      throw new Error("Notion webhook refused: the X-Notion-Signature header is missing.");
    }
    const expected = "sha256=" + await hmac("SHA-256", secret, body, "hex");
    if (!timingSafeEqual(given.toLowerCase(), expected)) {
      throw new Error("Notion webhook refused: the signature does not match.");
    }
    const o = parse(body);
    const type = str(o.type);
    if (!type) return [];
    const wanted = params.eventTypes ?? [];
    if (wanted.length > 0 && !wanted.includes(type)) return [];
    const entity = obj(o.entity);
    return [{
      id: str(o.id),
      type,
      timestamp: str(o.timestamp),
      workspaceId: str(o.workspace_id),
      workspaceName: str(o.workspace_name),
      subscriptionId: str(o.subscription_id),
      integrationId: str(o.integration_id),
      entityId: str(entity?.id),
      entityType: str(entity?.type),
      authors: Array.isArray(o.authors) ? o.authors : [],
      data: obj(o.data) ?? {},
      attemptNumber: typeof o.attempt_number === "number" ? o.attempt_number : null,
    }];
  },
};
