import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  contactIdentity,
  idempotencyHeader,
  json,
  LoopsClient,
  mailingListSubscriptions,
} from "../lib/client.ts";
import { CONTACT_IDENTITY_PARAMS, IDEMPOTENCY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/events/send` — verified against Loops' OpenAPI document (required
 * `eventName`).
 *
 * **This is how a workflow triggers a Loops loop.** An event is not a log line:
 * Loops matches it against the event triggers on your workflows and may send
 * real email as a result. Sending `trial_ended` twice can send two emails,
 * which is why the idempotency key matters here as much as on a direct send.
 *
 * **It creates the contact if there is not one.** The spec's 400 example is
 * *"Contact not found."*, but that is the failure for a mismatched identity —
 * with `email` supplied, Loops will create the contact and then fire the event.
 * So an event is also a write to the audience, not only a signal.
 */
const action: ActionDefinition = {
  key: "event-send",
  type: "perform",
  resource: "event",
  title: "Send an event",
  description: "Fire a Loops event, which can trigger workflow emails.",
  // Two events can mean two emails unless the idempotency key is used.
  idempotent: false,
  params: [
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "trial_ended",
      hint: "Must match the event a workflow trigger listens for.",
    },
    ...CONTACT_IDENTITY_PARAMS,
    {
      key: "eventProperties",
      label: "Event Properties",
      type: "json",
      default: "",
      placeholder: '{"plan":"pro","seats":12}',
      hint: "Available to the emails this event triggers.",
    },
    {
      key: "mailingLists",
      label: "Mailing Lists",
      type: "string",
      default: "",
      placeholder: "cm06f5v0e45nf0ml5754o9cix",
      hint: "Comma-separated ids to subscribe to. For removals, pass a JSON object of " +
        "id → true/false instead.",
    },
    IDEMPOTENCY_PARAM,
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted by Loops" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const eventName = String(p.eventName ?? "").trim();
    if (!eventName) throw new Error("`eventName` is required");
    const identity = contactIdentity(p.email, p.userId, "`event-send`");

    const body = compact({
      eventName,
      ...identity,
      eventProperties: json(p.eventProperties, "eventProperties"),
      mailingLists: mailingListSubscriptions(p.mailingLists),
    });

    const headers = idempotencyHeader(ctx, p.useInvocationIdempotencyKey);
    ctx.log("info", "sending a Loops event", { eventName, idempotent: Boolean(headers) });

    return await new LoopsClient(ctx).request("/events/send", {
      method: "POST",
      body,
      headers,
    });
  },
};

export default action;
