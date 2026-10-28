import type { ActionDefinition } from "@w6w/types";
import { compact, GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}/keyEvents` — verified against Google's
 * Admin API discovery document (`analyticsadmin.properties.keyEvents.create`).
 *
 * Marks an existing event name as a key event. It does not create the event
 * itself — GA4 events come from the data streams — so this only takes effect
 * once the property is actually receiving that event name.
 */
const action: ActionDefinition = {
  key: "key-event-create",
  type: "perform",
  resource: "keyEvent",
  title: "Create a key event",
  description: "Mark an event name as a key event on a property.",
  // Google rejects a duplicate event name rather than deduping.
  idempotent: false,
  params: [
    PROPERTY_PARAM,
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "purchase",
      hint: "An event name the property already receives.",
    },
    {
      key: "countingMethod",
      label: "Counting Method",
      type: "select",
      default: "ONCE_PER_EVENT",
      options: [
        { value: "ONCE_PER_EVENT", label: "Once per event" },
        { value: "ONCE_PER_SESSION", label: "Once per session" },
      ],
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "eventName", type: "string", label: "Event name" },
    { key: "countingMethod", type: "string", label: "Counting method" },
    { key: "custom", type: "boolean", label: "Custom" },
    { key: "createTime", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const eventName = String(p.eventName ?? "").trim();
    if (!eventName) throw new Error("`eventName` is required");

    // Defaulted here as well as on the param, so the sent body is the same
    // whether or not the host filled the param default in.
    const body = compact({
      eventName,
      countingMethod: (p.countingMethod as string) || "ONCE_PER_EVENT",
    });

    ctx.log("info", "creating GA4 key event", { property, eventName });

    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}/keyEvents`,
      { method: "POST", body },
    );
  },
};

export default action;
