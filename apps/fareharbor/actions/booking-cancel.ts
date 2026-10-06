import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { bookingParam, companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  bookingUuid: string;
  withPayments?: boolean;
}

const bookingCancel: ActionDefinition<Input> = {
  key: "booking-cancel",
  type: "perform",
  resource: "booking",
  title: "Cancel Booking",
  description:
    "Cancel a booking. Allowed within 5 minutes of creating it regardless of policy; after that the company's cancellation policy and your permission decide. Within 48 hours of the start there is no refund. Any affiliate-collected payments must be refunded first.",
  idempotent: false,
  params: [
    companyParam,
    bookingParam,
    {
      key: "withPayments",
      label: "With payments",
      type: "boolean",
      hint: "Include the booking's payments in the response.",
    },
  ],
  output: [
    { key: "booking", type: "object", label: "Cancelled booking" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/bookings/${
        seg(input.bookingUuid, "bookingUuid")
      }/`,
      {
        method: "DELETE",
        query: { with_payments: input.withPayments },
      },
    );
  },
};

export default bookingCancel;
