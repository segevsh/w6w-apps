import type { Param } from "@w6w/types";
import type { TriggerParams } from "./triggers.ts";

/**
 * The Any Event trigger. HeyGen's `POST /v3/webhooks/endpoints` takes `events` as an optional list of
 * event types and documents that omitting it (or `null`) subscribes the endpoint to ALL event types
 * (https://developers.heygen.com/reference/create-webhook-endpoint , verified 2026-11-10), and the
 * vendor's list grows (`GET /v3/webhooks/event-types`), so the names are NOT checked here against a
 * frozen list: a name HeyGen does not know is refused by HeyGen when the endpoint is created. The
 * `events` param narrows the registration and, belt and braces, what the run receives.
 *
 * Signing is the named triggers': `signature` header, hex HMAC-SHA256 of the raw body under the
 * endpoint secret HeyGen returns once at creation, secret required first (`verifySignature`).
 */

export interface AnyEventParams extends TriggerParams {
  events?: string;
}

/** The event types in a comma-separated `events` param; throws on a malformed name. */
export function parseEventTypes(raw: string | undefined): string[] {
  const names = [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const bad = names.filter((n) => !/^[a-z0-9_.]+$/.test(n));
  if (bad.length) {
    throw new Error(
      `Not a HeyGen event type: ${bad.join(", ")}. Event types look like avatar_video.success.`,
    );
  }
  return names;
}

export const PARAMS: Param[] = [{
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated HeyGen event types, e.g. avatar_video.success,video_translate.fail. Leave empty to receive every event type.",
}];
