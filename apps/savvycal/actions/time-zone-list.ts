import type { ActionDefinition } from "@w6w/types";
import { compact, SavvyCalClient } from "../lib/client.ts";

interface Input {
  instant?: string;
  includeLegacy?: boolean;
}

const timeZoneList: ActionDefinition<Input> = {
  key: "time-zone-list",
  type: "read",
  resource: "time-zone",
  title: "List Time Zones",
  description:
    "Time zones with localized names, offsets and DST flags, returned under `timeZones`.",
  params: [
    {
      key: "instant",
      label: "Instant",
      type: "string",
      hint: "ISO 8601 moment to compute offsets and DST at (default: now).",
    },
    { key: "includeLegacy", label: "Include legacy zones", type: "boolean" },
  ],
  output: [{ key: "timeZones", type: "array", label: "Time zones" }],

  async execute(input, ctx) {
    const zones = await new SavvyCalClient(ctx).json<unknown[]>("/time_zones", {
      query: compact({
        instant: input.instant,
        include_legacy: input.includeLegacy === true ? "true" : undefined,
      }) as Record<string, string>,
    });
    return { timeZones: Array.isArray(zones) ? zones : [] };
  },
};

export default timeZoneList;
