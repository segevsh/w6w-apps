import type { OutputField, TriggerDefinition } from "@w6w/types";
import { header } from "../../_shared/webhook/mod.ts";

/**
 * Home Assistant webhook trigger (rfcs/trigger.md, webhook form, manual receiver, UNSIGNED).
 *
 * Home Assistant has no outbound event feed of its own; the documented way to make it call a URL is
 * the `rest_command` integration, which an automation runs as an action
 * (`action: rest_command.<name>`) with a `url`, `method`, `content_type` and `payload` template
 * the user writes. So this trigger is a receiver for whatever such an automation sends:
 *
 *   - `onSubscribe` makes no Home Assistant call (the instance is configured by the user in
 *     YAML): it hands back the `callbackUrl` to put in the `rest_command` and `onUnsubscribe` is a
 *     no-op.
 *   - Home Assistant signs nothing: `rest_command` has no signing option, only whatever static
 *     `headers` the user adds. There is nothing to verify and no scheme is invented. The trust
 *     model is the callback URL: the host issues it per subscription as an unguessable id; anyone
 *     who learns it can post a forged event, so it must be kept private (treat it like a password).
 *   - `handleIngest` accepts any method `rest_command` offers (get, patch, post, put, delete) and
 *     returns the request as one event: the parsed JSON object, or form fields, or the plain text.
 *     Request headers are NOT copied into the event (they may carry credentials).
 *
 * Docs (verified 2026-11-10): https://www.home-assistant.io/integrations/rest_command/
 */

export interface TriggerParams {
  [key: string]: unknown;
}

/** The run's `trigger.event`: one request an automation sent. */
export interface HomeAssistantEvent {
  method: string;
  contentType: string | null;
  query: Record<string, string>;
  /** The parsed JSON object or form fields; null when the body was plain text or empty. */
  data: Record<string, unknown> | null;
  /** The body as text when it was neither JSON nor form fields; null otherwise. */
  text: string | null;
}

export const OUTPUT: OutputField[] = [
  { key: "method", type: "string", label: "HTTP method the automation used" },
  { key: "contentType", type: "string", label: "Content type of the request" },
  { key: "query", type: "object", label: "Query string parameters" },
  { key: "data", type: "object", label: "Body as a JSON object or form fields" },
  { key: "text", type: "string", label: "Body as text when it is not JSON or form fields" },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The request body → `{ data, text }`: JSON object, else form fields, else the text. */
export function parseBody(
  body: unknown,
  rawBody: unknown,
  contentType: string | null,
): { data: Record<string, unknown> | null; text: string | null } {
  let b: unknown = body;
  if ((b === undefined || b === null) && typeof rawBody === "string") b = rawBody;
  if (b === undefined || b === null || b === "") return { data: null, text: null };
  if (typeof b === "string") {
    const text: string = b;
    try {
      b = JSON.parse(text);
    } catch {
      if (contentType === "application/x-www-form-urlencoded") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of new URLSearchParams(text)) out[k] = v;
        return { data: out, text: null };
      }
      return { data: null, text };
    }
  }
  const obj = asObject(b);
  // A JSON array or scalar is kept as its JSON text rather than dropped.
  return obj ? { data: obj, text: null } : { data: null, text: JSON.stringify(b) };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  sample: HomeAssistantEvent;
}

/** Build the Home Assistant automation-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, HomeAssistantEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    handleIngest({ raw }) {
      const method = raw.method.toUpperCase();
      if (!METHODS.includes(method)) {
        throw new Error(
          `Home Assistant's rest_command sends GET, POST, PUT, PATCH or DELETE, not ${raw.method}.`,
        );
      }
      const contentType = header(raw, "content-type")?.split(";")[0].trim().toLowerCase() || null;
      const { data, text } = parseBody(raw.body, raw.rawBody, contentType);
      return [{ method, contentType, query: raw.query ?? {}, data, text }];
    },
  };
}
