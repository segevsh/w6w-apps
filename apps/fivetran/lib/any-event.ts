import type { Param } from "@w6w/types";
import type { TriggerParams } from "./triggers.ts";

/**
 * The Any Event trigger. Fivetran's webhook API takes a REQUIRED `events` array (the OpenAPI
 * `WebhookRequest` lists `url` and `events` as required, with no "all" token), so "every event"
 * means registering the full documented list below.
 *
 * Docs (verified 2026-11-10): https://fivetran.com/docs/rest-api/webhooks (the event list),
 * https://fivetran.com/assets-docs/openapi/file_v1.yaml (`WebhookRequest`).
 *
 * Signing is the named triggers': `X-Fivetran-Signature-256`, hex HMAC-SHA256 of the raw body under
 * a per-subscription random secret, secret required first (`verifySignature`).
 */

/** Every event Fivetran documents for webhooks, minus the deprecated `status`. */
export const ALL_EVENTS = [
  "sync_start",
  "sync_end",
  "transformation_start",
  "transformation_succeeded",
  "transformation_failed",
  "connection_successful",
  "connection_failure",
  "create_connector",
  "pause_connector",
  "resume_connector",
  "edit_connector",
  "delete_connector",
  "force_update_connector",
  "resync_connector",
  "resync_table",
] as const;

/** `status` is deprecated but still accepted if a user asks for it by name. */
const ACCEPTED = [...ALL_EVENTS, "status"] as readonly string[];

export interface AnyEventParams extends TriggerParams {
  events?: string;
}

/** The names in a comma-separated `events` param; throws on one Fivetran does not document. */
export function parseEventNames(raw: string | undefined): string[] {
  const names = [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const bad = names.filter((n) => !ACCEPTED.includes(n));
  if (bad.length) {
    throw new Error(`Unknown Fivetran event(s): ${bad.join(", ")}. Use ${ALL_EVENTS.join(", ")}.`);
  }
  return names;
}

export const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated Fivetran events (${
    ALL_EVENTS.join(", ")
  }). Leave empty to receive every event.`,
};
