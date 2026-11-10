import type { OutputField, TriggerDefinition } from "@w6w/types";

/**
 * Cognito Forms webhook triggers (rfcs/trigger.md, webhook form, manual receiver, UNSIGNED).
 *
 *   - Cognito Forms webhooks are set per form, in the form's Settings ("Post JSON Data to a
 *     Website"), with one endpoint each for new, updated and deleted entries. They are not
 *     reachable through the REST API this app calls, so `onSubscribe` makes no Cognito call: it
 *     hands back the `callbackUrl` the user pastes there and `onUnsubscribe` is a no-op.
 *   - Cognito Forms documents NO delivery signature, header secret or timestamp, so there is
 *     nothing to verify and none is invented: the callback URL is the only credential. Anyone who
 *     learns it can post an entry to the workflow.
 *   - `handleIngest` accepts a POSTed JSON object and emits it as one event.
 *
 * Docs (verified 2026-11-10): https://www.cognitoforms.com/support/66/data-integration/webhooks
 */

/** The run's `trigger.event`: one entry posted by Cognito Forms. */
export interface CognitoEvent {
  event: "entry.submitted" | "entry.updated" | "entry.deleted";
  entryId: string | null;
  formId: string | null;
  /** The whole delivery, with the form's own JSON field names. */
  entry: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event (submitted, updated or deleted)" },
  { key: "entryId", type: "string", label: "Entry ID" },
  { key: "formId", type: "string", label: "Form ID" },
  { key: "entry", type: "object", label: "Entry (all field data)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a JSON object. */
export function normalizeDelivery(body: unknown, event: CognitoEvent["event"]): CognitoEvent {
  const entry = asObject(body);
  if (!entry) throw new Error("Not a Cognito Forms webhook delivery: expected a JSON object.");
  const meta = asObject(entry.Entry);
  const form = asObject(entry.Form);
  return {
    event,
    // Cognito documents the payload only as the entry's JSON; read the id where it is usually put.
    entryId: str(meta?.Id) ?? str(entry.Id) ?? str(entry.id),
    formId: str(form?.Id) ?? str(entry.FormId),
    entry,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: CognitoEvent["event"];
  sample: CognitoEvent;
}

/** Build one Cognito Forms entry webhook trigger (the callback URL is the only credential). */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, CognitoEvent, { callbackUrl: string }> {
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
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Cognito Forms delivers webhooks with POST, not ${raw.method}.`);
      }
      return [normalizeDelivery(raw.body, spec.event)];
    },
  };
}
