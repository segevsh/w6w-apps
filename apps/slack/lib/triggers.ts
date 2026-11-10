import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";

/**
 * Slack Events API triggers (rfcs/trigger.md, manual-webhook form).
 *
 * Slack signs every Events API request, the `url_verification` handshake included:
 * `X-Slack-Signature` is `v0=` + hex HMAC-SHA256 of `v0:<X-Slack-Request-Timestamp>:<raw body>`,
 * keyed by the Slack app's Signing Secret (not in the connection, so the trigger takes it as a
 * secret param, D5 (2)). A delivery more than five minutes from now is refused.
 *
 *   - `onSubscribe` makes no Slack call (an Events API URL is set by hand in the app's settings);
 *     it hands back the `callbackUrl` the user pastes there.
 *   - `handleIngest` verifies the signature over the raw body FIRST, then answers the
 *     `url_verification` handshake with its `challenge`, or turns an `event_callback` into one event.
 *
 * Slack retries a delivery it did not get a 200 for within three seconds and marks the retry with
 * `X-Slack-Retry-Num`; the host has no dedupe, so every event carries its `eventId` for a workflow
 * that needs one.
 */

export const SIGNATURE_WINDOW_SEC = 300;

export interface TriggerParams {
  signingSecret?: string;
  eventTypes?: string;
  channelId?: string;
  ignoreBotMessages?: boolean;
}

export interface TriggerState {
  callbackUrl: string;
}

export interface SlackEvent {
  eventId: string | null;
  eventTime: number | null;
  teamId: string | null;
  apiAppId: string | null;
  type: string;
  subtype: string | null;
  channel: string | null;
  user: string | null;
  text: string | null;
  ts: string | null;
  threadTs: string | null;
  isBot: boolean;
  event: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Signing Secret",
  type: "secret",
  required: true,
  hint:
    "Slack app settings, Basic Information, App Credentials, Signing Secret. Slack signs every delivery with it; a delivery that does not verify is refused.",
};

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "eventTime", type: "number", label: "Event Time (epoch seconds)" },
  { key: "teamId", type: "string", label: "Workspace ID" },
  { key: "apiAppId", type: "string", label: "App ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "subtype", type: "string", label: "Event Subtype" },
  { key: "channel", type: "string", label: "Channel ID" },
  { key: "user", type: "string", label: "User ID" },
  { key: "text", type: "string", label: "Text" },
  { key: "ts", type: "string", label: "Message Timestamp" },
  { key: "threadTs", type: "string", label: "Thread Timestamp" },
  { key: "isBot", type: "boolean", label: "From a Bot" },
  { key: "event", type: "object", label: "Raw Event" },
];

export const MESSAGE_SAMPLE: SlackEvent = {
  eventId: "Ev0PV52K21",
  eventTime: 1531420618,
  teamId: "T1DC2JH3J",
  apiAppId: "A0PNCHHK2",
  type: "message",
  subtype: null,
  channel: "C2147483705",
  user: "U2147483697",
  text: "Hello world",
  ts: "1355517523.000005",
  threadTs: null,
  isBot: false,
  event: {
    type: "message",
    channel: "C2147483705",
    user: "U2147483697",
    text: "Hello world",
    ts: "1355517523.000005",
  },
};

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The `id` of an object-valued field (`channel_created` carries a channel object, `team_join` a user). */
function idOf(v: unknown): string | null {
  return str(asObject(v)?.id);
}

/** Throws unless the delivery carries a valid, fresh Slack signature over the raw body. */
export async function verifySlackSignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingSecret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const secret = requireSecret(signingSecret);
  const body = requireRawBody(raw);
  const timestamp = header(raw, "x-slack-request-timestamp");
  const signature = header(raw, "x-slack-signature");
  if (!timestamp || !signature) {
    throw new Error("Slack delivery refused: the signature headers are missing.");
  }
  if (!withinTolerance(Number(timestamp), nowMs, SIGNATURE_WINDOW_SEC)) {
    throw new Error("Slack delivery refused: the request timestamp is outside the allowed window.");
  }
  const expected = `v0=${await hmac("SHA-256", secret, `v0:${timestamp}:${body}`, "hex")}`;
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Slack delivery refused: the signature does not match.");
  }
  return body;
}

function normalize(payload: Record<string, unknown>, ev: Record<string, unknown>): SlackEvent {
  return {
    eventId: str(payload.event_id),
    eventTime: typeof payload.event_time === "number" ? payload.event_time : null,
    teamId: str(payload.team_id),
    apiAppId: str(payload.api_app_id),
    type: str(ev.type) ?? "unknown",
    subtype: str(ev.subtype),
    channel: str(ev.channel) ?? idOf(ev.channel) ?? str(ev.channel_id) ??
      str(asObject(ev.item)?.channel) ?? null,
    user: str(ev.user) ?? idOf(ev.user) ?? str(ev.user_id) ?? null,
    text: str(ev.text),
    ts: str(ev.ts),
    threadTs: str(ev.thread_ts),
    isBot: ev.subtype === "bot_message" || str(ev.bot_id) !== null,
    event: ev,
  };
}

/** Message subtypes that are a new message a person could have written. */
const NEW_MESSAGE_SUBTYPES = new Set(["file_share", "thread_broadcast", "bot_message"]);

/** A sample run for a named trigger: the shared envelope around that trigger's own raw event. */
function namedSample(ev: Record<string, unknown>): SlackEvent {
  return normalize({
    event_id: MESSAGE_SAMPLE.eventId,
    event_time: MESSAGE_SAMPLE.eventTime,
    team_id: MESSAGE_SAMPLE.teamId,
    api_app_id: MESSAGE_SAMPLE.apiAppId,
  }, ev);
}

export interface SlackTriggerSpec {
  key: string;
  title: string;
  description: string;
  /**
   * `message`: only new messages. `event`: every event type named in the `eventTypes` param.
   * `named`: exactly the Events API types in `named.types` (narrowed by `named.subtypes` for the
   * `message` event, whose edits and deletes are subtypes), optionally per channel.
   */
  kind: "message" | "event" | "named";
  named?: {
    types: string[];
    subtypes?: string[];
    /** Offer the optional `channelId` filter (events that happen in a channel). */
    channelScoped?: boolean;
    /** The raw `event` of the sample run. */
    sampleEvent: Record<string, unknown>;
  };
}

export function slackTrigger(
  spec: SlackTriggerSpec,
): TriggerDefinition<TriggerParams, SlackEvent, TriggerState> {
  const isMessage = spec.kind === "message";
  const named = spec.kind === "named" ? spec.named : undefined;
  const params: Param[] = [SIGNING_SECRET_PARAM];
  if (named) {
    if (named.channelScoped) {
      params.push({
        key: "channelId",
        label: "Channel ID",
        type: "string",
        advanced: true,
        hint: "Only events in this channel. Leave empty for every channel the app can see.",
      });
    }
  } else if (isMessage) {
    params.push(
      {
        key: "channelId",
        label: "Channel ID",
        type: "string",
        advanced: true,
        hint: "Only messages in this channel. Leave empty for every channel the app is in.",
      },
      {
        key: "ignoreBotMessages",
        label: "Ignore bot messages",
        type: "boolean",
        default: true,
        advanced: true,
        hint:
          "Skip messages posted by bots, including this app, so a workflow cannot trigger itself.",
      },
    );
  } else {
    params.push({
      key: "eventTypes",
      label: "Event types",
      type: "string",
      advanced: true,
      hint:
        "Comma-separated Slack event types to fire on, e.g. reaction_added,channel_created. Leave empty for every event the app is subscribed to.",
    });
  }

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: EVENT_OUTPUT,
    sample: named ? namedSample(named.sampleEvent) : isMessage ? MESSAGE_SAMPLE : {
      ...MESSAGE_SAMPLE,
      type: "reaction_added",
      text: null,
      event: { type: "reaction_added", user: "U2147483697", reaction: "thumbsup" },
    },

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      const body = await verifySlackSignature(raw, params?.signingSecret);
      let payload: Record<string, unknown> | null;
      try {
        payload = asObject(JSON.parse(body));
      } catch {
        payload = null;
      }
      if (!payload) throw new Error("Slack delivery refused: the body is not a JSON object.");

      if (payload.type === "url_verification") {
        const challenge = str(payload.challenge);
        if (!challenge) throw new Error("Slack url_verification carried no challenge.");
        return {
          events: [],
          response: { status: 200, headers: { "content-type": "text/plain" }, body: challenge },
        };
      }
      if (payload.type !== "event_callback") return [];
      const ev = asObject(payload.event);
      if (!ev) return [];
      const event = normalize(payload, ev);

      if (named) {
        if (!named.types.includes(event.type)) return [];
        if (named.subtypes && (event.subtype === null || !named.subtypes.includes(event.subtype))) {
          return [];
        }
        const channel = params?.channelId?.trim();
        if (channel && event.channel !== channel) return [];
      } else if (isMessage) {
        if (event.type !== "message") return [];
        if (event.subtype !== null && !NEW_MESSAGE_SUBTYPES.has(event.subtype)) return [];
        if (params?.ignoreBotMessages !== false && event.isBot) return [];
        const channel = params?.channelId?.trim();
        if (channel && event.channel !== channel) return [];
      } else {
        const wanted = (params?.eventTypes ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        if (wanted.length > 0 && !wanted.includes(event.type)) return [];
      }
      return [event];
    },

    parseOutput({ normalized }) {
      return normalized as SlackEvent;
    },
  };
}
