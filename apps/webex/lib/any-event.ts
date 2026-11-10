import type { Param } from "@w6w/types";

/**
 * The Any Event trigger: ONE Webex webhook registered with `resource: "all", event: "all"` — the
 * "all resource firehose", which Webex documents as covering `memberships`, `messages` and `rooms`
 * (https://developer.webex.com/messaging/docs/api/v1/webhooks/create-a-webhook , verified
 * 2026-11-10). The `events` param narrows what the run receives; Webex itself is always asked for
 * the whole firehose, because one registration can name only one resource/event pair.
 *
 * Signature handling is the named triggers' (`X-Spark-Signature`, hex HMAC-SHA1 of the raw body
 * under a per-subscription secret, secret required first, verified before anything is parsed).
 */

/** Every `<resource>.<event>` Webex's catalog lists for the three firehose resources. */
export const ANY_EVENT_NAMES = [
  "memberships.created",
  "memberships.updated",
  "memberships.deleted",
  "messages.created",
  "messages.deleted",
  "rooms.created",
  "rooms.updated",
] as const;

export interface AnyEventParams {
  events?: string;
}

/** The names in a comma-separated `events` param; throws on one the firehose cannot deliver. */
export function parseEventNames(raw: string | undefined): string[] {
  const names = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const bad = names.filter((n) => !(ANY_EVENT_NAMES as readonly string[]).includes(n));
  if (bad.length) {
    throw new Error(
      `Unknown Webex event name(s): ${bad.join(", ")}. Use ${ANY_EVENT_NAMES.join(", ")}.`,
    );
  }
  return names;
}

export const PARAMS: Param[] = [{
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated events as resource.event (${
    ANY_EVENT_NAMES.join(", ")
  }). Leave empty to receive every event.`,
}];
