import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { EVENT_OUTPUT } from "./create-event.ts";

interface Input {
  eventSeriesId: string;
  expand?: string;
}

const getEventSeries: ActionDefinition<Input> = {
  key: "get-event-series",
  type: "read",
  resource: "event",
  title: "Get Event Series",
  description: "Retrieve the parent event of an event series by its series ID.",
  params: [
    { key: "eventSeriesId", label: "Event series ID", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "Comma-separated expansions, e.g. `series_dates`.",
    },
  ],
  output: [...EVENT_OUTPUT, { key: "series_dates", type: "array", label: "Series dates" }],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/series/${encodeURIComponent(input.eventSeriesId)}/`, {
      query: { expand: input.expand },
    });
  },
};

export default getEventSeries;
