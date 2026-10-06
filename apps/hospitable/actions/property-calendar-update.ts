import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient, jsonValue } from "../lib/client.ts";

/** `PUT /v2/properties/{uuid}/calendar` — Update availability, price and restrictions per date. */
interface Input {
  uuid: string;
  dates: unknown;
}

const propertyCalendarUpdate: ActionDefinition<Input> = {
  key: "property-calendar-update",
  type: "perform",
  resource: "calendar",
  title: "Update Property Calendar",
  description:
    "Set availability, nightly price, minimum stay, check-in/check-out closures and notes for dates up to 3 years ahead. Applied asynchronously, so a read straight afterwards may not show it yet.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Property UUID", type: "string", required: true },
    {
      key: "dates",
      label: "Dates",
      type: "json",
      required: true,
      hint:
        'JSON array of day entries, each {"date": "YYYY-MM-DD", "price": {"amount": 15000}, "available": true, "min_stay": 2, "closed_for_checkin": false, "closed_for_checkout": false, "note": "…"}. Only the keys you send are changed; price.amount is in minor units. Needs the calendar:write scope.',
    },
  ],
  output: [{ key: "status", type: "string", label: "Acceptance status (HTTP 202)" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request(
      "PUT",
      `/properties/${encodeId(input.uuid)}/calendar`,
      { body: { dates: jsonValue(input.dates) } },
    );
  },
};

export default propertyCalendarUpdate;
