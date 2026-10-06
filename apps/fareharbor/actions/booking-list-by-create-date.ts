import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg, ymd } from "../lib/params.ts";

interface Input {
  shortname: string;
  date: string;
}

const bookingListByCreateDate: ActionDefinition<Input> = {
  key: "booking-list-by-create-date",
  type: "search",
  resource: "booking",
  title: "List Bookings by Create Date",
  description:
    "List the minimal records (pk, uuid, status) of every booking created on one date. The cheap way to poll for new bookings; fetch each with Get Booking.",
  params: [
    companyParam,
    {
      key: "date",
      label: "Created on",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "bookings", type: "array", label: "Bookings (pk, uuid, status, company)" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/minimal/bookings-by-create-date/${
        ymd(input.date, "date")
      }/`,
    );
  },
};

export default bookingListByCreateDate;
