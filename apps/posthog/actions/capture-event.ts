import type { ActionDefinition } from "@w6w/types";
import { ingestionHost } from "../lib/client.ts";

/**
 * Send an event via `POST /i/v0/e/` on the ingestion/capture API.
 * Source: https://posthog.com/docs/api/capture (verified live 2026-08-01).
 *
 * ## Why this does NOT use the app's Auth (Personal API Key)
 *
 * PostHog has two structurally different key types, and this action
 * deliberately does not conflate them:
 *
 * - The **Personal API Key** (this app's Auth method) is a private,
 *   account-scoped bearer credential for the app/query REST API
 *   (`us.posthog.com` / `eu.posthog.com`). It must never be embedded in
 *   client-side code or a request body.
 * - The **Project API Key** (a.k.a. project token, `phc_...`) used here is,
 *   by PostHog's own design, a PUBLIC identifier — the same key that ships
 *   inside every posthog-js snippet in a customer's frontend. It authorizes
 *   nothing beyond "write events into this project" and is passed as a
 *   plain `api_key` field in the JSON body, not a header — the capture
 *   endpoint takes no `Authorization` header at all.
 *
 * Because it is a different key, on a different host, with a different (and
 * intentionally non-secret) trust model, it is modeled as its own action
 * param — `projectApiKey`, type `string` rather than `secret` — instead of a
 * second Auth field. This also means the action needs no stored Connection
 * to run at all: `requiresAuth: false`, with its own `region` param, so it
 * can fire from a workflow that never went through PostHog Auth.
 */
const action: ActionDefinition = {
  key: "capture-event",
  type: "perform",
  resource: "event",
  title: "Capture Event",
  description: "Send an analytics event to PostHog using a (public) Project API Key.",
  idempotent: false,
  requiresAuth: false,
  params: [
    {
      key: "projectApiKey",
      label: "Project API Key",
      type: "string",
      required: true,
      hint:
        "Project Settings → Project API Key. This is the public client-side token (starts with `phc_`) — NOT your Personal API Key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      options: [
        { value: "us", label: "United States (us.i.posthog.com)" },
        { value: "eu", label: "Europe (eu.i.posthog.com)" },
      ],
    },
    { key: "event", label: "Event Name", type: "string", required: true },
    {
      key: "distinctId",
      label: "Distinct ID",
      type: "string",
      required: true,
      hint: "The user or anonymous id this event is attributed to.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      default: {},
      hint: 'Arbitrary event properties, e.g. { "plan": "pro" }.',
    },
    {
      key: "timestamp",
      label: "Timestamp",
      type: "datetime",
      hint: "ISO 8601. Leave unset to use the time PostHog receives the event.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "response", type: "object", label: "Response body" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectApiKey = String(p.projectApiKey ?? "").trim();
    const region = p.region === "eu" ? "eu" : "us";
    const event = String(p.event ?? "").trim();
    const distinctId = String(p.distinctId ?? "").trim();
    const properties = (p.properties ?? {}) as Record<string, unknown>;
    const timestamp = typeof p.timestamp === "string" && p.timestamp ? p.timestamp : undefined;

    if (!projectApiKey) throw new Error("`projectApiKey` is required");
    if (!event) throw new Error("`event` is required");
    if (!distinctId) throw new Error("`distinctId` is required");

    const body: Record<string, unknown> = {
      api_key: projectApiKey,
      event,
      distinct_id: distinctId,
      properties,
    };
    if (timestamp) body.timestamp = timestamp;

    ctx.log("info", "capturing PostHog event", { event, distinctId });

    const host = ingestionHost(region);
    const res = await ctx.fetch(`https://${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const response = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new Error(`PostHog /i/v0/e/ returned ${res.status}: ${text}`);
    }
    return { status: res.status, response };
  },
};

export default action;
