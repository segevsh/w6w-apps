import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
  from?: string;
  until?: string;
}

const linkSlotsGet: ActionDefinition<Input> = {
  key: "link-slots-get",
  type: "read",
  resource: "link",
  title: "Get Link Slots",
  description:
    "List available time slots on a scheduling link. When the link allows several durations, " +
    "every duration is returned (slots may share a start time). The response is a bare array " +
    "of {start_at, end_at, duration, rank}, returned here under `slots`.",
  params: [
    { key: "linkId", label: "Link ID", type: "string", required: true },
    { key: "from", label: "From", type: "string", hint: "Lower bound (date or ISO 8601)." },
    { key: "until", label: "Until", type: "string", hint: "Upper bound (date or ISO 8601)." },
  ],
  output: [{ key: "slots", type: "array", label: "Slots" }],

  async execute(input, ctx) {
    const slots = await new SavvyCalClient(ctx).json<unknown[]>(
      `/links/${encodeId(input.linkId)}/slots`,
      { query: compact({ from: input.from, until: input.until }) as Record<string, string> },
    );
    return { slots: Array.isArray(slots) ? slots : [] };
  },
};

export default linkSlotsGet;
