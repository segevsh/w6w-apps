import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/properties/{uuid}/calendar` — A property's day-by-day calendar. */
interface Input {
  uuid: string;
  start_date?: string;
  end_date?: string;
}

const propertyCalendarGet: ActionDefinition<Input> = {
  key: "property-calendar-get",
  type: "read",
  resource: "calendar",
  title: "Get Property Calendar",
  description:
    "Get a property's calendar: per day the availability status, price, minimum stay and check-in/check-out restrictions.",
  params: [
    { key: "uuid", label: "Property UUID", type: "string", required: true },
    { key: "start_date", label: "Start date", type: "date", hint: "YYYY-MM-DD." },
    { key: "end_date", label: "End date", type: "date", hint: "YYYY-MM-DD." },
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request(
      "GET",
      `/properties/${encodeId(input.uuid)}/calendar`,
      { query: { start_date: input.start_date, end_date: input.end_date } },
    );
  },
};

export default propertyCalendarGet;
