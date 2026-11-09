import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { FormstackClient } from "./client.ts";

/**
 * Formstack form-submission webhook (V2025 `/forms/{formId}/webhooks`, rfcs/trigger.md).
 *
 *   - `onSubscribe` generates a random shared secret (D5 (1): Formstack takes a caller-chosen
 *     `sharedSecret` — the older v2 API calls it `handshake_key`), removes any webhook already
 *     pointed at the host's `callbackUrl` on that form, then creates a JSON-bodied webhook. The
 *     secret is kept in the subscription state.
 *   - `onUnsubscribe` deletes the webhook; one Formstack no longer has counts as deleted.
 *   - `handleIngest` reads the raw body, requires the stored secret to exist, and refuses any
 *     delivery whose handshake key differs (constant-time compare). The handshake key is a shared
 *     secret echoed in the payload — not an HMAC — so it proves the sender knows the secret, not
 *     that the body is untampered. It is removed from the emitted event.
 *
 * UNVERIFIED: the V2025 reference documents `sharedSecret` on the webhook object but not the
 * name of the field that carries it in a delivery. The v2 reference names it `HandshakeKey` (the
 * v2 request field is `handshake_key`); this accepts `HandshakeKey`, `handshake_key` and
 * `sharedSecret` and refuses a delivery carrying none of them.
 */

export interface TriggerParams {
  formId?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  formId: string;
  sharedSecret: string;
}

const KEY_FIELDS = ["HandshakeKey", "handshake_key", "sharedSecret"] as const;

export const FORM_ID_PARAM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "From List Forms, or the numeric id in the form's Formstack URL.",
};

export const SUBMISSION_OUTPUT: OutputField[] = [
  { key: "FormID", type: "string", label: "Form ID" },
  { key: "UniqueID", type: "string", label: "Submission ID" },
  { key: "fields", type: "object", label: "Field values (the rest of the payload)" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

async function deleteWebhook(client: FormstackClient, formId: string, id: string): Promise<void> {
  try {
    await client.request(
      `/forms/${encodeURIComponent(formId)}/webhooks/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  } catch (err) {
    if (/^Formstack (404|410) /.test(String((err as Error)?.message))) return;
    throw err;
  }
}

/** One delivery: the identifying fields plus every answer, minus the handshake key. */
export interface FormstackSubmission {
  FormID: string | null;
  UniqueID: string | null;
  fields: Record<string, unknown>;
}

export const submissionWebhook: TriggerDefinition<
  TriggerParams,
  FormstackSubmission,
  TriggerState
> = {
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each submission of the selected Formstack form as it arrives.",
  params: [FORM_ID_PARAM],
  output: SUBMISSION_OUTPUT,
  sample: {
    FormID: "1234567",
    UniqueID: "987654321",
    fields: { "Name": "Ada Lovelace", "Email": "ada@example.com" },
  },

  async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
    const formId = params.formId?.trim();
    if (!formId) throw new Error("A Formstack form ID is required.");
    const client = new FormstackClient(ctx);
    const base = `/forms/${encodeURIComponent(formId)}/webhooks`;
    const listed = await client.request<{ webhooks?: Array<{ id?: unknown; url?: unknown }> }>(
      base,
    );
    for (const w of listed?.webhooks ?? []) {
      const id = str(w.id);
      if (id && w.url === callbackUrl) await deleteWebhook(client, formId, id);
    }
    const sharedSecret = randomSecret();
    const created = await client.request<{ id?: unknown }>(base, {
      method: "POST",
      body: {
        name: "w6w new-submission",
        url: callbackUrl,
        contentType: "json",
        sharedSecret,
      },
    });
    const webhookId = str(created?.id);
    if (!webhookId) throw new Error("Formstack created the webhook but returned no id.");
    return { webhookId, formId, sharedSecret };
  },

  async onUnsubscribe({ state }, ctx: HookContext) {
    if (state?.webhookId && state.formId) {
      await deleteWebhook(new FormstackClient(ctx), state.formId, state.webhookId);
    }
  },

  handleIngest({ raw, state }) {
    const expected = requireSecret(state?.sharedSecret);
    const body = requireRawBody(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Formstack delivery refused: the body is not JSON.");
    }
    const delivery = asObject(parsed);
    const given = KEY_FIELDS.map((k) => delivery?.[k]).find((v) => typeof v === "string");
    if (!delivery || !timingSafeEqual(given as string, expected)) {
      throw new Error("Formstack delivery refused: the handshake key does not match.");
    }
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(delivery)) {
      if (!(KEY_FIELDS as readonly string[]).includes(k) && k !== "FormID" && k !== "UniqueID") {
        fields[k] = v;
      }
    }
    return [{ FormID: str(delivery.FormID), UniqueID: str(delivery.UniqueID), fields }];
  },
};
