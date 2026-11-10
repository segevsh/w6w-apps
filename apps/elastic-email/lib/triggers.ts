import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { ElasticClient, encodeId } from "./client.ts";

/**
 * Elastic Email notification-webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a SIGNED, JSON-delivery webhook for ONE notification type with
 *     `POST /v4/webhook` (`EnableSigning: true`, `DeliveryMethod: "PostJson"`). Elastic Email
 *     chooses the secret and returns it once (`SigningSecret`); the host keeps it in subscription
 *     state (D5: the vendor chooses). A webhook that comes back without a secret is deleted and
 *     refused: a vendor that signs is never accepted unsigned. `onUnsubscribe` deletes it with
 *     `DELETE /v4/webhook/{id}`; one Elastic Email no longer has counts as deleted.
 *   - `handleIngest` verifies the signature BEFORE it parses anything. The signed string is
 *     `<X-ElasticEmail-Timestamp>\nPOST\n<request target>\n<raw body>` where the request target is
 *     the path and query of the URL the webhook was registered with (kept in state as
 *     `callbackUrl`); `X-ElasticEmail-Signature` is a comma-separated list of `v1=<hex HMAC-SHA256>`
 *     entries and any one may match. A timestamp more than five minutes from the clock is refused.
 *
 * Docs (verified 2026-11-10):
 * https://help.elasticemail.com/en/articles/17578018-webhook-request-signing-and-json-delivery ,
 * https://help.elasticemail.com/en/articles/4804685-notification-settings and
 * https://elasticemail.com/api/redoc-spec/api-v4 (`/webhook`, `/webhook/{publicid}`).
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  secret: string;
  callbackUrl: string;
}

/** The run's `trigger.event`: one email notification. */
export interface EmailEvent {
  status: string;
  transaction: string | null;
  to: string | null;
  from: string | null;
  date: string | null;
  subject: string | null;
  channel: string | null;
  account: string | null;
  messageId: string | null;
  category: string | null;
  target: string | null;
  ip: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  userAgent: string | null;
  webhookId: string | null;
}

const OUTPUT: OutputField[] = [
  { key: "status", type: "string", label: "Status" },
  { key: "transaction", type: "string", label: "Transaction ID" },
  { key: "to", type: "string", label: "Recipient" },
  { key: "from", type: "string", label: "Sender" },
  { key: "date", type: "string", label: "Event Date (UTC, as sent)" },
  { key: "subject", type: "string", label: "Subject" },
  { key: "channel", type: "string", label: "Channel" },
  { key: "account", type: "string", label: "Account" },
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "category", type: "string", label: "Bounce Category" },
  { key: "target", type: "string", label: "Clicked Link" },
  { key: "ip", type: "string", label: "Recipient IP" },
  { key: "country", type: "string", label: "Country" },
  { key: "state", type: "string", label: "State" },
  { key: "city", type: "string", label: "City" },
  { key: "userAgent", type: "string", label: "User Agent" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** A webhook name Elastic Email will take, unique to the subscription. */
export function nameFor(subscriptionId: string): string {
  const clean = String(subscriptionId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
  return `w6w-${clean || "sub"}`;
}

/** True for the "no such webhook" answers `ElasticClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Elastic Email (404|410)\b/.test(err.message);
}

/** Path + query of the URL the webhook was registered with: the request target Elastic Email signs. */
export function requestTarget(callbackUrl: unknown): string {
  let url: URL;
  try {
    url = new URL(String(callbackUrl));
  } catch {
    throw new Error("Elastic Email delivery refused: the subscription has no usable callback URL.");
  }
  return `${url.pathname}${url.search}`;
}

/**
 * The delivery body → its event (field names are matched case-insensitively: the vendor documents
 * `IP`/`Useragent` and delivers lower case). Throws on a body that is not an email notification.
 */
export function normalizeDelivery(
  body: unknown,
  webhookId: string | null = null,
): EmailEvent {
  const obj = asObject(body);
  const f: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj ?? {})) f[k.toLowerCase()] = v;
  const status = str(f.status);
  if (!obj || !status) throw new Error("Not an Elastic Email notification: expected `status`.");
  return {
    status,
    transaction: str(f.transaction),
    to: str(f.to),
    from: str(f.from),
    date: str(f.date),
    subject: str(f.subject),
    channel: str(f.channel),
    account: str(f.account),
    messageId: str(f.messageid),
    category: str(f.category),
    target: str(f.target),
    ip: str(f.ip),
    country: str(f.country),
    state: str(f.state),
    city: str(f.city),
    userAgent: str(f.useragent),
    webhookId,
  };
}

/**
 * Check the signature headers against the exact bytes received and the clock. Throws (never
 * echoing the secret, the signature or any header) unless one `v1=` entry matches; an unset secret
 * is refused before any compare. Returns the verified body text.
 */
export async function verifySignature(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  callbackUrl: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const timestamp = header(raw, "x-elasticemail-timestamp");
  const given = header(raw, "x-elasticemail-signature");
  if (given === undefined || given === "") {
    throw new Error(
      "Elastic Email delivery refused: the X-ElasticEmail-Signature header is missing.",
    );
  }
  if (timestamp === undefined || !/^\d+$/.test(timestamp)) {
    throw new Error(
      "Elastic Email delivery refused: the X-ElasticEmail-Timestamp header is missing.",
    );
  }
  if (!withinTolerance(Number(timestamp), nowMs)) {
    throw new Error(
      "Elastic Email delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  const target = requestTarget(callbackUrl);
  const expected = await hmac(
    "SHA-256",
    key,
    `${timestamp}\n${raw.method.toUpperCase()}\n${target}\n${body}`,
    "hex",
  );
  let ok = false;
  for (const part of given.split(",")) {
    const entry = part.trim();
    if (entry.startsWith("v1=") && timingSafeEqual(expected, entry.slice(3))) ok = true;
  }
  if (!ok) throw new Error("Elastic Email delivery refused: the signature does not match.");
  return body;
}

type NotificationFlag =
  | "NotificationForSent"
  | "NotificationForOpened"
  | "NotificationForClicked"
  | "NotificationForUnsubscribed"
  | "NotificationForAbuseReport"
  | "NotificationForError";

/** The six notification types of `POST /v4/webhook`: `status` value (lower case) → its flag. */
export const NOTIFICATIONS: Record<string, NotificationFlag> = {
  sent: "NotificationForSent",
  opened: "NotificationForOpened",
  clicked: "NotificationForClicked",
  unsubscribed: "NotificationForUnsubscribed",
  abusereport: "NotificationForAbuseReport",
  error: "NotificationForError",
};

export const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated notification types to react to: Sent, Opened, Clicked, Unsubscribed, AbuseReport, Error. Leave empty for all six. Elastic Email is asked to send only these.",
};

/** `Sent, opened` → `["sent","opened"]`; throws on a name that is not a notification type. */
export function parseEvents(v: unknown): string[] {
  const names = typeof v === "string"
    ? v.split(",").map((e) => e.trim().toLowerCase()).filter((e) => e !== "")
    : [];
  for (const n of names) {
    if (!Object.hasOwn(NOTIFICATIONS, n)) {
      throw new Error(
        `Unknown Elastic Email notification "${n}": use Sent, Opened, Clicked, Unsubscribed, AbuseReport or Error.`,
      );
    }
  }
  return [...new Set(names)];
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The `NotificationFor…` flag of `POST /v4/webhook` this trigger switches on. */
  flag?: NotificationFlag;
  /** The `status` value those notifications carry (matched case-insensitively). */
  status?: string;
  /** Any-event trigger: the `events` param picks the notification types (empty = all six). */
  anyEvent?: boolean;
  sample: EmailEvent;
}

/** Build one Elastic Email notification webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<{ events?: string }, EmailEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.anyEvent ? [EVENTS_PARAM] : [],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      requestTarget(callbackUrl);
      // Any-event: the registered subscription is the listed notification types (empty = all six).
      const picked = spec.anyEvent ? parseEvents(params?.events) : [];
      const flags = spec.anyEvent
        ? (picked.length > 0 ? picked : Object.keys(NOTIFICATIONS)).map((n) => NOTIFICATIONS[n])
        : [spec.flag!];
      const client = new ElasticClient(ctx);
      const created = await client.json<{ WebhookID?: unknown; SigningSecret?: unknown }>(
        "/webhook",
        {
          method: "POST",
          body: {
            Name: nameFor(subscriptionId),
            URL: callbackUrl,
            ...Object.fromEntries(flags.map((f) => [f, true])),
            EnableSigning: true,
            DeliveryMethod: "PostJson",
          },
        },
      );
      const webhookId = str(created?.WebhookID);
      const secret = str(created?.SigningSecret);
      if (!webhookId) {
        throw new Error("Elastic Email did not return the id of the webhook it created.");
      }
      if (!secret) {
        // A webhook whose deliveries could not be verified is never kept.
        try {
          await client.json(`/webhook/${encodeId(webhookId)}`, { method: "DELETE" });
        } catch { /* best-effort cleanup */ }
        throw new Error(
          "Elastic Email did not return a signing secret, so deliveries could not be verified.",
        );
      }
      return { webhookId, secret, callbackUrl };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new ElasticClient(ctx).json(`/webhook/${encodeId(s.webhookId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Elastic Email delivers signed webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret, state?.callbackUrl);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Elastic Email delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(
        parsed,
        header(raw, "x-elasticemail-webhook-id") ?? state?.webhookId ?? null,
      );
      // Other statuses (and the test notification sent when a webhook is created) get no run.
      const status = event.status.toLowerCase();
      if (spec.status !== undefined && status !== spec.status.toLowerCase()) return [];
      if (spec.anyEvent) {
        const wanted = parseEvents(params?.events);
        if (wanted.length > 0 && !wanted.includes(status)) return [];
      }
      return [event];
    },
  };
}
