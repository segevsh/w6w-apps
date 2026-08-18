import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `GET /api/config` — what this instance is.
 *
 * Version, location, time zone, unit system and the list of loaded components.
 * Two of those matter more than they look:
 *
 * **The unit system** is instance-wide and decides how every sensor reports.
 * A workflow doing arithmetic on a temperature needs to know whether it is
 * reading Celsius or Fahrenheit, and this is where that is decided — the
 * per-entity `unit_of_measurement` follows from it.
 *
 * **`components`** is how to tell whether an integration is actually installed
 * before calling a service that depends on it. Calling `notify.mobile_app_x`
 * when the mobile app integration is not loaded fails at the service layer with
 * an unhelpful message.
 *
 * `state` is `RUNNING` in normal operation and `STARTING` while integrations
 * are still loading — during which entities exist but many read `unavailable`,
 * which is a real and confusing window after a restart.
 */
const action: ActionDefinition = {
  key: "config-get",
  type: "read",
  resource: "config",
  title: "Get instance configuration",
  description:
    "Version, time zone, unit system and loaded components. The unit system is instance-wide and " +
    "decides what every temperature sensor's numbers mean.",
  params: [
    {
      key: "includeComponents",
      label: "Include Components",
      type: "boolean",
      default: false,
      hint: "The full list is long. On, it is how to check an integration is loaded before " +
        "calling a service that needs it.",
    },
  ],
  output: [
    { key: "version", type: "string", label: "Home Assistant version" },
    { key: "locationName", type: "string", label: "What the installation calls itself" },
    { key: "timeZone", type: "string", label: "IANA zone" },
    { key: "unitSystem", type: "object", label: "Instance-wide units" },
    { key: "state", type: "string", label: "RUNNING, or STARTING while integrations load" },
    { key: "ready", type: "boolean", label: "State is RUNNING" },
    { key: "components", type: "array", label: "Loaded integrations, when asked for" },
    { key: "componentCount", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const config = await new HomeAssistantClient(ctx).request<{
      version?: string;
      location_name?: string;
      time_zone?: string;
      unit_system?: Record<string, string>;
      state?: string;
      components?: string[];
    }>("/config");

    const components = config?.components ?? [];
    return {
      version: config?.version,
      locationName: config?.location_name,
      timeZone: config?.time_zone,
      unitSystem: config?.unit_system,
      state: config?.state,
      // STARTING is a real window in which entities exist but read unavailable.
      ready: config?.state === "RUNNING",
      components: p.includeComponents === true ? components : undefined,
      componentCount: components.length,
    };
  },
};

export default action;
