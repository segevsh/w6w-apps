import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { SurveyMonkeyClient } from "./client.ts";

/**
 * SurveyMonkey webhook trigger (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a `response_completed` webhook on one survey (`POST /v3/webhooks`).
 *     SurveyMonkey pings the callback URL with a HEAD request while creating it and wants a 200;
 *     `handleIngest` answers a HEAD with no events (nothing is accepted from it).
 *   - `onUnsubscribe` deletes it; one SurveyMonkey no longer has counts as deleted.
 *   - `handleIngest` verifies `Sm-Signature`: base64 HMAC-SHA1 of the exact request body under the
 *     key `<client id>&<client secret>`, BEFORE it parses anything. SurveyMonkey signs with the
 *     app's credentials, which the connection does not expose to a trigger, so the client id and
 *     secret are trigger params (D5 (2)). The signature carries no timestamp: no replay window.
 *   - `parseOutput` fetches the response the notification names (the delivery holds only ids).
 *
 * Docs (verified 2026-11-09): https://api.surveymonkey.com/v3/docs (Webhooks, Webhook Callbacks).
 */

export interface TriggerParams {
  surveyId: string;
  clientId: string;
  clientSecret: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  surveyId: string;
}

/** The stored event: the notification, which names the response but does not carry it. */
export interface NormalizedEvent {
  eventId: string | null;
  eventType: string;
  name: string | null;
  responseId: string | null;
  surveyId: string | null;
  collectorId: string | null;
  respondentId: string | null;
  userId: string | null;
  eventDatetime: string | null;
}

/** The run's `trigger.event`: the notification plus the response it names. */
export interface ResponseEvent extends NormalizedEvent {
  /** The fetched response; `null` when it no longer exists. */
  response: Record<string, unknown> | null;
}

const PARAMS: Param[] = [
  {
    key: "surveyId",
    label: "Survey ID",
    type: "string",
    required: true,
    hint: "The survey to watch (see Get Many Surveys).",
  },
  {
    key: "clientId",
    label: "Client ID",
    type: "string",
    required: true,
    hint:
      "Your SurveyMonkey app's Client ID (developer.surveymonkey.com > My Apps > Settings). Used only to verify deliveries.",
  },
  {
    key: "clientSecret",
    label: "Client Secret",
    type: "secret",
    required: true,
    hint:
      "Your SurveyMonkey app's Client Secret (same page). SurveyMonkey signs every delivery with it; without it nothing is accepted.",
  },
];

const OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "name", type: "string", label: "Webhook Name" },
  { key: "responseId", type: "string", label: "Response ID" },
  { key: "surveyId", type: "string", label: "Survey ID" },
  { key: "collectorId", type: "string", label: "Collector ID" },
  { key: "respondentId", type: "string", label: "Respondent ID" },
  { key: "userId", type: "string", label: "User ID" },
  { key: "eventDatetime", type: "string", label: "Event Time" },
  { key: "response", type: "object", label: "Response" },
];

const SAMPLE: ResponseEvent = {
  eventId: "123456789",
  eventType: "response_completed",
  name: "w6w response_completed",
  responseId: "123456",
  surveyId: "987654321",
  collectorId: "123456789",
  respondentId: "123456789",
  userId: "11223344",
  eventDatetime: "2026-11-09T10:15:00.182613+00:00",
  response: {
    id: "123456",
    response_status: "completed",
    pages: [{ id: "1", questions: [{ id: "10", answers: [{ text: "Great" }] }] }],
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → the notification. Throws on a body that is not a SurveyMonkey event. */
export function normalizeDelivery(body: unknown): NormalizedEvent {
  const d = asObject(body);
  const eventType = str(d?.event_type);
  if (!d || !eventType) {
    throw new Error("Not a SurveyMonkey webhook delivery: expected `event_type`.");
  }
  const resources = asObject(d.resources);
  return {
    eventId: str(d.event_id),
    eventType,
    name: str(d.name),
    responseId: str(d.object_id),
    surveyId: str(resources?.survey_id),
    collectorId: str(resources?.collector_id),
    respondentId: str(resources?.respondent_id),
    userId: str(resources?.user_id),
    eventDatetime: str(d.event_datetime),
  };
}

/**
 * Verify `Sm-Signature` over the exact bytes received and return them. Throws (never echoing the
 * client id, secret, signature or header) on failure; unset credentials are refused before any
 * compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  clientId: unknown,
  clientSecret: unknown,
): Promise<string> {
  const body = requireRawBody(raw);
  const id = requireSecret(clientId);
  const secret = requireSecret(clientSecret);
  const given = header(raw, "sm-signature");
  if (given === undefined || given === "") {
    throw new Error("SurveyMonkey delivery refused: the Sm-Signature header is missing.");
  }
  const expected = await hmac("SHA-1", `${id}&${secret}`, body, "base64");
  if (!timingSafeEqual(expected, given.trim())) {
    throw new Error("SurveyMonkey delivery refused: the signature does not match.");
  }
  return body;
}

function isGone(err: unknown): boolean {
  return err instanceof Error && /^SurveyMonkey (404|410)\b/.test(err.message);
}

function isNormalized(v: unknown): v is NormalizedEvent {
  const o = asObject(v);
  return !!o && typeof o.eventType === "string" && "responseId" in o;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the SurveyMonkey "response completed" webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, NormalizedEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx: HookContext) {
      const surveyId = params.surveyId?.trim();
      if (!surveyId) throw new Error("Choose the SurveyMonkey survey to watch.");
      requireSecret(params.clientId);
      requireSecret(params.clientSecret);
      const created = await new SurveyMonkeyClient(ctx).request<{ id?: unknown }>("/webhooks", {
        method: "POST",
        body: {
          name: `w6w ${subscriptionId}`,
          event_type: "response_completed",
          object_type: "survey",
          object_ids: [surveyId],
          subscription_url: callbackUrl,
        },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("SurveyMonkey created the webhook but returned no id.");
      return { webhookId, surveyId };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (!id) return;
      try {
        await new SurveyMonkeyClient(ctx).request(`/webhooks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      const method = raw.method.toUpperCase();
      // SurveyMonkey's creation-time reachability ping: it must answer 200 and carries no data.
      if (method === "HEAD") return [];
      if (method !== "POST") {
        throw new Error(`SurveyMonkey delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.clientId, params?.clientSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("SurveyMonkey delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      if (event.eventType !== "response_completed") return [];
      if (state?.surveyId && event.surveyId && event.surveyId !== state.surveyId) return [];
      return [event];
    },

    async parseOutput({ normalized, call }, ctx): Promise<ResponseEvent> {
      const event = isNormalized(normalized)
        ? normalized
        : normalizeDelivery(asObject(call)?.body ?? normalized);
      if (!event.surveyId || !event.responseId) return { ...event, response: null };
      try {
        const response = await new SurveyMonkeyClient(ctx).request(
          `/surveys/${encodeURIComponent(event.surveyId)}/responses/${
            encodeURIComponent(event.responseId)
          }/details`,
        );
        return { ...event, response: asObject(response) };
      } catch (err) {
        if (isGone(err)) return { ...event, response: null };
        throw err;
      }
    },
  };
}
