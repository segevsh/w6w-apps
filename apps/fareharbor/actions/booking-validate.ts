import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { availabilityParam, companyParam, parseJson, pk, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  availabilityPk: number | string;
  contact: Record<string, unknown> | string;
  customers: unknown[] | string;
  customFieldValues?: unknown[] | string;
  note?: string;
  voucherNumber?: string;
  externalId?: string;
}

const bookingValidate: ActionDefinition<Input> = {
  key: "booking-validate",
  type: "read",
  resource: "booking",
  title: "Validate Booking",
  description:
    "Dry-run a booking without creating it: returns whether it is bookable, the price, and the reason it is not. FareHarbor requires validating before an instantly-confirmed booking. A refusal comes back as `is_bookable: false` with a `code` and `error`, not as an HTTP error.",
  params: [
    companyParam,
    availabilityParam,
    {
      key: "contact",
      label: "Contact",
      type: "json",
      required: true,
      hint: 'JSON object {"name", "phone", "email"} — the head of the party.',
    },
    {
      key: "customers",
      label: "Customers",
      type: "json",
      required: true,
      hint:
        'JSON array of {"customer_type_rate": <pk>, "custom_field_values": [{"custom_field": <pk>, "value": …}]}, one entry per person. Each customer_type_rate must belong to the availability.',
    },
    {
      key: "customFieldValues",
      label: "Custom field values",
      type: "json",
      hint:
        'Optional JSON array of {"custom_field": <pk>, "value": <string | boolean | extended-option pk>} for booking-level custom fields.',
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      hint: "A note on the booking.",
    },
    {
      key: "voucherNumber",
      label: "Voucher number",
      type: "string",
      hint:
        "Your external booking reference. Affiliate bookings may require one; non-affiliate bookings are refused if one is given.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own identifier for this booking.",
    },
  ],
  output: [
    { key: "is_bookable", type: "boolean", label: "Bookable" },
    { key: "invoice_price", type: "number", label: "Price" },
    { key: "error", type: "string", label: "Reason it is not bookable" },
    { key: "code", type: "string", label: "Error code" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/bookings/validate/`,
      {
        method: "POST",
        body: {
          contact: parseJson(input.contact, "contact"),
          customers: parseJson(input.customers, "customers"),
          custom_field_values:
            input.customFieldValues === undefined || input.customFieldValues === ""
              ? undefined
              : parseJson(input.customFieldValues, "customFieldValues"),
          note: input.note || undefined,
          voucher_number: input.voucherNumber || undefined,
          external_id: input.externalId || undefined,
        },
      },
    );
  },
};

export default bookingValidate;
