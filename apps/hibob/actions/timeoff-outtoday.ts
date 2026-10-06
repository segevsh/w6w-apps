import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { requireDate } from "../lib/params.ts";

interface Input {
  today?: string;
  includeHourly?: boolean;
  includePrivate?: boolean;
  siteId?: number;
}

/** `GET /v1/timeoff/outtoday` — who is out today (UTC), or on a given date; optionally for one site. */
const timeoffOuttoday: ActionDefinition<Input> = {
  key: "timeoff-outtoday",
  type: "read",
  resource: "timeoff",
  title: "Who's Out Today",
  description: "List people out of office today, or on a specific date.",
  params: [
    { key: "today", label: "Date", type: "date", hint: "Defaults to today in UTC." },
    { key: "includeHourly", label: "Include hourly requests", type: "boolean", default: false },
    { key: "includePrivate", label: "Include private requests", type: "boolean", default: false },
    { key: "siteId", label: "Site ID", type: "number", hint: "Only employees at this site." },
  ],
  output: [{
    key: "outs",
    type: "object",
    label: "Time off entries; shape varies by request type",
  }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get("/timeoff/outtoday", {
      today: input.today ? requireDate(input.today, "today") : undefined,
      includeHourly: input.includeHourly ? true : undefined,
      includePrivate: input.includePrivate ? true : undefined,
      siteId: input.siteId,
    });
  },
};

export default timeoffOuttoday;
