import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";

/** `GET /v2/channels` — The booking-platform channels connected to the account. */
const channelList: ActionDefinition<Record<string, never>> = {
  key: "channel-list",
  type: "read",
  resource: "account",
  title: "List Channels",
  description:
    "List the booking-platform channels connected to the account (Airbnb, Vrbo, Booking.com, Agoda, iCal, manual, direct).",
  params: [],
  output: [{ key: "data", type: "array", label: "Channels" }],

  execute(_input, ctx) {
    return new HospitableClient(ctx).request("GET", "/channels");
  },
};

export default channelList;
