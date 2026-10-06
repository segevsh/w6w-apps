import type { ActionDefinition } from "@w6w/types";
import { compact, FareHarborClient } from "../lib/client.ts";
import { bookingParam, checkinStatus, companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  bookingUuid: string;
  customerPk?: number;
  checkinStatus?: string | number;
}

const bookingCheckin: ActionDefinition<Input> = {
  key: "booking-checkin",
  type: "perform",
  resource: "booking",
  title: "Check In Booking",
  description:
    "Check in a booking, or one customer on it. With no Customer ID every customer is checked in. Check-in status defaults to FareHarbor's automatic choice.",
  idempotent: false,
  params: [
    companyParam,
    bookingParam,
    {
      key: "customerPk",
      label: "Customer ID",
      type: "number",
      hint: "Check in only this customer's pk. Omit to check in everyone on the booking.",
    },
    {
      key: "checkinStatus",
      label: "Check-in status",
      type: "string",
      hint: "`auto` (default), `unchanged`, or a check-in status pk from List Check-in Statuses.",
    },
  ],
  output: [
    { key: "booking", type: "object", label: "Booking" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/bookings/${
        seg(input.bookingUuid, "bookingUuid")
      }/checkin/`,
      {
        method: "PUT",
        body: compact({
          customer: input.customerPk,
          checkin_status: checkinStatus(input.checkinStatus),
        }),
      },
    );
  },
};

export default bookingCheckin;
