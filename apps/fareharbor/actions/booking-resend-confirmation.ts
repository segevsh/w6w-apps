import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { ymd } from "../lib/params.ts";

interface Input {
  email: string;
  dateFrom: string;
  dateTo: string;
}

const bookingResendConfirmation: ActionDefinition<Input> = {
  key: "booking-resend-confirmation",
  type: "perform",
  resource: "booking",
  title: "Resend Confirmation Email",
  description:
    "Queue confirmation-email resends for every non-cancelled booking whose contact email and start date match. Emails go only to the address already on each booking, and the response never says whether anything matched. Limits: 5 requests/minute per key pair and 1 per 5 minutes per email.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Contact email",
      type: "string",
      required: true,
      hint: "The contact email on the booking(s).",
    },
    {
      key: "dateFrom",
      label: "Start date from",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD.",
    },
    {
      key: "dateTo",
      label: "Start date to",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Vendor message" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request("/bookings/resend-confirmation-email/", {
      method: "POST",
      body: {
        email: input.email,
        date_from: ymd(input.dateFrom, "dateFrom"),
        date_to: ymd(input.dateTo, "dateTo"),
      },
    });
  },
};

export default bookingResendConfirmation;
