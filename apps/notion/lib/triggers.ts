import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Notion triggers (rfcs/trigger.md).
 *
 * 1. Webhook triggers (`webhookTrigger`): Notion webhooks are configured by hand in the
 *    integration settings (Webhooks tab); no API registers a subscription. So:
 *      - `onSubscribe` makes no Notion call; it returns the callback URL to paste into Notion and
 *        `onUnsubscribe` is a no-op (the user deletes the subscription in Notion).
 *      - Notion signs every event with `X-Notion-Signature: sha256=<hex HMAC-SHA256 of the exact
 *        request body>` keyed by the subscription's `verification_token` (D5 (2): a secret-typed
 *        `signingSecret` param). The signature carries no timestamp, so there is no replay window
 *        (Notion retries up to 24 hours). `handleIngest` verifies it BEFORE it parses anything.
 *      - Setup handshake: when a subscription is created Notion POSTs `{"verification_token": …}`
 *        UNSIGNED, and the user must paste that token back into Notion. The one carve-out from
 *        "a signed vendor is never accepted unsigned": while `signingSecret` is still EMPTY, a body
 *        that is exactly `{"verification_token": "<string>"}` is delivered as a single
 *        `verification` event so the user can read the token from the run and paste it into Notion
 *        and into the trigger's Verification Token param. Every other delivery needs the secret.
 *        Once the secret is set, every delivery (handshake included) must be signed.
 *
 * 2. Snapshot poll triggers (`snapshotTrigger`) for bounded collections that Notion returns in no
 *    guaranteed order: they walk the wrapped list action's cursor up to `MAX_PAGES` pages and diff
 *    the ids with `pollSnapshot`.
 *
 * Docs (verified 2026-11-10):
 *   https://developers.notion.com/reference/webhooks
 *   https://developers.notion.com/reference/webhooks-events-delivery
 */

// --- webhooks -------------------------------------------------------------------------------

export interface WebhookParams {
  /** The subscription's verification token (Notion > Integration > Webhooks). */
  signingSecret?: string;
  /** Any-event trigger only: comma-separated Notion event types; empty = every event. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface WebhookState {
  mode: "manual";
  callbackUrl: string;
}

/** The stored event: one verified delivery (or the unsigned setup `verification` handshake). */
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
  verificationToken: string | null;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "timestamp", type: "string", label: "Event Time" },
  { key: "workspaceId", type: "string", label: "Workspace ID" },
  { key: "workspaceName", type: "string", label: "Workspace Name" },
  { key: "subscriptionId", type: "string", label: "Subscription ID" },
  { key: "integrationId", type: "string", label: "Connection ID" },
  { key: "entityId", type: "string", label: "Entity ID" },
  { key: "entityType", type: "string", label: "Entity Type" },
  { key: "authors", type: "array", label: "Authors" },
  { key: "data", type: "object", label: "Event Data" },
  { key: "attemptNumber", type: "number", label: "Delivery Attempt" },
  { key: "verificationToken", type: "string", label: "Verification Token (setup only)" },
];

const SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Verification Token",
  type: "secret",
  hint:
    "The subscription's verification_token. Leave empty first: add the trigger, paste its URL into Notion (integration > Webhooks > Create a subscription), and Notion sends the token to this trigger as a `verification` event. Paste it here and into Notion's Verify dialog. Required before any real event is accepted.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Notion event types to react to, e.g. page.created,comment.created. Leave blank for every event.",
};

const refused = (why: string) => new Error(`Notion webhook delivery refused: ${why}`);

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Notion webhook delivery body is not valid JSON.");
  }
}

/** The unsigned setup body: exactly `{"verification_token": "<non-empty string>"}`. */
function handshakeToken(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const o = asObject(parsed);
  if (!o || Object.keys(o).length !== 1) return null;
  return str(o.verification_token);
}

/** Verify `X-Notion-Signature` over the exact bytes received. Never echoes secret or signature. */
async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  body: string,
  secret: string,
): Promise<void> {
  const given = header(raw, "x-notion-signature");
  if (given === undefined || given === "") {
    throw refused("the X-Notion-Signature header is missing");
  }
  const expected = `sha256=${await hmac("SHA-256", secret, body, "hex")}`;
  if (!timingSafeEqual(expected, given.trim().toLowerCase())) {
    throw refused("the signature does not match");
  }
}

function normalize(o: Record<string, unknown>): NotionEvent {
  const entity = asObject(o.entity);
  return {
    id: str(o.id),
    type: str(o.type)!,
    timestamp: str(o.timestamp),
    workspaceId: str(o.workspace_id),
    workspaceName: str(o.workspace_name),
    subscriptionId: str(o.subscription_id),
    integrationId: str(o.integration_id),
    entityId: str(entity?.id),
    entityType: str(entity?.type),
    authors: Array.isArray(o.authors) ? o.authors : [],
    data: asObject(o.data) ?? {},
    attemptNumber: typeof o.attempt_number === "number" ? o.attempt_number : null,
    verificationToken: null,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Notion event types this trigger delivers; omit for the Any-event trigger (`events` param). */
  eventTypes?: string[];
  sample: NotionEvent;
}

/** Build one Notion webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<WebhookParams, NotionEvent, WebhookState> {
  const fixed = spec.eventTypes;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [SECRET_PARAM] : [SECRET_PARAM, EVENTS_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.sample,
    requiresAuth: false,

    onSubscribe({ callbackUrl }) {
      return { mode: "manual", callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Notion delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const configured = params?.signingSecret;
      if (typeof configured !== "string" || configured === "") {
        // Setup phase: only the unsigned handshake gets through; everything else needs the secret.
        const token = handshakeToken(body);
        if (token !== null && header(raw, "x-notion-signature") === undefined) {
          return [{
            ...normalize({ type: "verification" }),
            verificationToken: token,
          }];
        }
      }
      const secret = requireSecret(configured);
      await verifySignature(raw, body, secret);

      const o = asObject(parseJson(body));
      const type = str(o?.type);
      if (!o || !type) throw new Error("Not a Notion webhook delivery: expected a `type`.");
      const wanted = fixed ??
        (params?.events ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "");
      if (wanted.length > 0 && !wanted.includes(type)) return [];
      return [normalize(o)];
    },
  };
}

// --- snapshot polls -------------------------------------------------------------------------

/** Pages of 100 walked per check; a larger collection fails loudly instead of silently missing rows. */
export const MAX_PAGES = 20;
const PAGE_SIZE = 100;

interface Listing {
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface SnapshotTriggerSpec<P> {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** The wrapped action's input for one page (`startCursor` is added by the walker). */
  input(params: P): Record<string, unknown>;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  /** Also emit a change when an item's own content changes (default: new items only). */
  updated?: boolean;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}

/** Walk the action's cursor to the end, at most `MAX_PAGES` pages. */
async function walk<P>(
  spec: SnapshotTriggerSpec<P>,
  params: P,
  ctx: HookContext,
): Promise<Array<{ key: string; values: unknown }>> {
  const rows = new Map<string, unknown>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await (spec.action as unknown as ActionDefinition).execute(
      { ...spec.input(params), pageSize: PAGE_SIZE, ...(cursor ? { startCursor: cursor } : {}) },
      ctx,
    ) as Listing;
    for (const item of spec.items(result)) {
      const key = spec.idOf(item);
      if (!rows.has(key)) rows.set(key, item);
    }
    if (!result.has_more || !result.next_cursor) {
      return [...rows].map(([key, values]) => ({ key, values }));
    }
    cursor = result.next_cursor;
  }
  throw new Error(
    `Notion ${spec.key}: more than ${
      MAX_PAGES * PAGE_SIZE
    } rows; this trigger only watches collections up to that size.`,
  );
}

/** A poll trigger over a small bounded Notion collection: each new id is one event. */
export function snapshotTrigger<P>(spec: SnapshotTriggerSpec<P>): TriggerDefinition<P> {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`snapshotTrigger(${spec.key}): only read/search actions may back a poll`);
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows = await walk(spec, params, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: spec.updated === true },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
