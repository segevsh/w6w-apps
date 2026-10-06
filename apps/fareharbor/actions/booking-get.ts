import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { bookingParam, companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  bookingUuid: string;
  withPayments?: boolean;
}

const bookingGet: ActionDefinition<Input> = {
  key: "booking-get",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description:
    "Fetch one booking by UUID: customers, contact, availability, pricing and status. Set With payments to include the payment records.",
  params: [
    companyParam,
    bookingParam,
    {
      key: "withPayments",
      label: "With payments",
      type: "boolean",
      hint: "Include the booking's payments.",
    },
  ],
  output: [
    { key: "booking", type: "object", label: "Booking" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/bookings/${
        seg(input.bookingUuid, "bookingUuid")
      }/`,
      {
        query: { with_payments: input.withPayments },
      },
    );
  },
};

export default bookingGet;
