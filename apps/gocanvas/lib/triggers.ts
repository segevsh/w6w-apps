import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "./client.ts";

/**
 * GoCanvas webhook triggers (rfcs/trigger.md, webhook form, API-registered, UNSIGNED).
 *
 *   - `onSubscribe` registers the callback URL for one event type: `POST /forms/{id}/webhooks`
 *     for a form (a form can hold only ONE webhook per event type, so a second subscription to the
 *     same form and event is refused by GoCanvas with its own message), or `POST /webhooks` for a
 *     company-wide webhook when no form is named (account administrators only). The body is
 *     `{ event_type, format: "json", push_url, push_tag }`. The webhook id goes into the state.
 *   - `onUnsubscribe` deletes it (soft delete, which frees the one-per-event slot); GoCanvas answers
 *     404 for a webhook that is already deleted, which counts as gone.
 *   - GoCanvas documents no signature, secret or signing header for webhooks, so there is NOTHING to
 *     verify and none is invented. The trust model is the callback URL: the host issues it per
 *     subscription as an unguessable id; anyone who learns it can post a forged delivery.
 *   - The API reference lists the event types but not the delivery body ("a payload containing some
 *     metadata about the event"; the help-centre article that may describe it is not reachable
 *     without a browser), so the parsed body is passed through whole as `payload`.
 *
 * Docs (verified 2026-11-10): https://api.gocanvas.com/api/v3/docs (Webhooks and Company-wide
 * Webhooks sections)
 */

export interface TriggerParams {
  formId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The form the webhook is on, or null for a company-wide webhook. */
  formId: string | null;
  webhookId: string;
}

/** The run's `trigger.event`: one GoCanvas webhook delivery. */
export interface GoCanvasEvent {
  eventType: string;
  formId: string | null;
  payload: Record<string, unknown>;
}

const FORM_PARAM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  hint:
    "The form to watch (Get Many Forms lists the ids). Leave empty for a company-wide webhook that covers every form; that needs an account administrator. A form can hold only one webhook per event.",
};

export const OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event type" },
  { key: "formId", type: "string", label: "Form ID (empty for a company-wide webhook)" },
  { key: "payload", type: "object", label: "Full webhook payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** True for the "no such webhook" answer `GoCanvasClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^GoCanvas 404\b/.test(err.message);
}

const hookPath = (formId: string | null, id?: string) =>
  `${formId ? `/forms/${encodeId(formId)}` : ""}/webhooks${id ? `/${encodeId(id)}` : ""}`;

/** The delivery body as an object: already parsed by the host, or JSON text. */
export function parseDelivery(raw: { body: unknown; rawBody?: unknown }): Record<string, unknown> {
  let b = raw.body;
  if (b == null && typeof raw.rawBody === "string") b = raw.rawBody;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {
      throw new Error("Not a GoCanvas webhook delivery: the body is not JSON.");
    }
  }
  const obj = asObject(b);
  if (!obj) throw new Error("Not a GoCanvas webhook delivery: expected a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The GoCanvas `event_type` this trigger registers for. */
  eventType: string;
  sample: GoCanvasEvent;
}

/** Build one GoCanvas event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, GoCanvasEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [FORM_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const formId = params?.formId?.toString().trim() || null;
      const made = await new GoCanvasClient(ctx).request<{ id?: unknown }>(hookPath(formId), {
        method: "POST",
        body: {
          event_type: spec.eventType,
          format: "json",
          push_url: callbackUrl,
          push_tag: "w6w",
        },
      });
      const id = typeof made?.id === "number" || typeof made?.id === "string"
        ? String(made.id)
        : "";
      if (id === "") {
        throw new Error(
          "GoCanvas did not return a webhook id, so the webhook cannot be removed later.",
        );
      }
      return { formId, webhookId: id };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new GoCanvasClient(ctx).request(hookPath(s.formId ?? null, s.webhookId), {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`GoCanvas delivers webhooks with POST, not ${raw.method}.`);
      }
      const formId = (state as Partial<TriggerState> | undefined)?.formId ?? null;
      return [{ eventType: spec.eventType, formId, payload: parseDelivery(raw) }];
    },
  };
}
