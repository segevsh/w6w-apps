import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { EVENT_EXPANSIONS } from "../lib/expansions.ts";
import { EVENT_SERIES_OUTPUT, EVENT_SERIES_SAMPLE } from "../lib/outputs.ts";

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
      type: "multiselect",
      options: [...EVENT_EXPANSIONS, { value: "series_dates", label: "Series dates" }],
      config: { valueFormat: "csv" },
      hint: "Select one or more related resources to include.",
    },
  ],
  output: [...EVENT_SERIES_OUTPUT],
  sample: EVENT_SERIES_SAMPLE,
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/series/${encodeURIComponent(input.eventSeriesId)}/`, {
      query: { expand: input.expand },
    });
  },
};

export default getEventSeries;
