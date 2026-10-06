import type { ActionDefinition } from "@w6w/types";
import { compact, encodeSegments, SavvyCalClient } from "../lib/client.ts";

interface Input {
  timeZone: string;
  instant?: string;
}

const timeZoneGet: ActionDefinition<Input> = {
  key: "time-zone-get",
  type: "read",
  resource: "time-zone",
  title: "Get Time Zone",
  description: "Detailed information about one IANA time zone.",
  params: [
    {
      key: "timeZone",
      label: "Time zone ID",
      type: "string",
      required: true,
      placeholder: "America/New_York",
    },
    { key: "instant", label: "Instant", type: "string", hint: "ISO 8601 (default: now)." },
  ],
  output: [{ key: "id", type: "string", label: "Time zone ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/time_zones/${encodeSegments(input.timeZone)}`, {
      query: compact({ instant: input.instant }) as Record<string, string>,
    });
  },
};

export default timeZoneGet;
