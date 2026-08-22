import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient, json } from "../lib/client.ts";

/**
 * `POST /api/events/<event_type>` — put an event on Home Assistant's bus.
 *
 * ## The way to trigger an automation from outside
 *
 * Home Assistant automations can trigger on an event type, and firing one from
 * a workflow is how an external system tells the house something happened —
 * far cleaner than writing a state and having an automation watch for it.
 *
 * The reply is `{"message": "Event ... fired."}`, and that is all it means: the
 * event was put on the bus. **Nothing reports whether anything listened.** An
 * automation that is disabled, or whose trigger has a typo in the event name,
 * produces exactly the same response as one that ran.
 *
 * ## Do not fire core events
 *
 * `state_changed`, `homeassistant_start`, `call_service` and the rest are
 * emitted by Home Assistant itself, and injecting fake ones puts the state
 * machine and the recorder into a state nothing expects. Custom event types —
 * anything not in Home Assistant's own vocabulary — are the intended use, and
 * this refuses the core ones.
 */

/** Events Home Assistant emits itself, which nothing external should forge. */
const CORE_EVENTS = new Set([
  "state_changed",
  "call_service",
  "service_registered",
  "service_removed",
  "homeassistant_start",
  "homeassistant_started",
  "homeassistant_stop",
  "homeassistant_final_write",
  "homeassistant_close",
  "component_loaded",
  "core_config_updated",
  "logbook_entry",
  "platform_discovered",
  "automation_triggered",
  "script_started",
  "entity_registry_updated",
  "device_registry_updated",
  "area_registry_updated",
  "user_added",
  "user_removed",
  "themes_updated",
  "recorder_5min_statistics_generated",
]);

const action: ActionDefinition = {
  key: "event-fire",
  type: "perform",
  resource: "event",
  title: "Fire an event",
  description:
    "Put a custom event on Home Assistant's bus — the clean way to trigger an automation from " +
    "outside. Nothing reports whether anything listened.",
  idempotent: false,
  params: [
    {
      key: "eventType",
      label: "Event Type",
      type: "string",
      required: true,
      default: "",
      placeholder: "delivery_arrived",
      hint: "Your own name. Core Home Assistant events are refused — forging `state_changed` " +
        "confuses the state machine and the recorder.",
    },
    {
      key: "data",
      label: "Event Data",
      type: "json",
      default: "",
      hint: "Reaches the automation as `trigger.event.data`.",
    },
  ],
  output: [
    { key: "fired", type: "boolean", label: "The event reached the bus" },
    { key: "eventType", type: "string", label: "What was fired" },
    { key: "message", type: "string", label: "Home Assistant's own reply" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const eventType = String(p.eventType ?? "").trim();
    if (!eventType) throw new Error("`eventType` is required");
    if (CORE_EVENTS.has(eventType)) {
      throw new Error(
        `\`${eventType}\` is an event Home Assistant emits itself. Firing a forged one puts the ` +
          "state machine and the recorder into a state nothing expects — use a custom event type " +
          "and trigger an automation on that instead",
      );
    }

    const result = await new HomeAssistantClient(ctx).request<{ message?: string }>(
      `/events/${encodeURIComponent(eventType)}`,
      { method: "POST", body: json(p.data, "data") ?? {} },
    );

    ctx.log("info", "fired a Home Assistant event", { eventType });
    // The reply says the event reached the bus, and nothing more than that.
    return { fired: true, eventType, message: result?.message };
  },
};

export default action;
