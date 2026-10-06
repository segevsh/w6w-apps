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
  lodging?: number;
  rebooking?: string;
  amountPaid?: number;
}

const bookingCreate: ActionDefinition<Input> = {
  key: "booking-create",
  type: "perform",
  resource: "booking",
  title: "Create Booking",
  description:
    "Book an availability. Fails if the slot is closed, over capacity or the customer type rates do not belong to it. Validate first. Pass Rebooking to replace an existing booking; the old one is marked rebooked.",
  idempotent: false,
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
    {
      key: "lodging",
      label: "Lodging ID",
      type: "number",
      hint: "A lodging pk, to request transportation. The response then carries pickup details.",
    },
    {
      key: "rebooking",
      label: "Rebooking (booking UUID)",
      type: "string",
      hint: "UUID of the booking this one replaces.",
    },
    {
      key: "amountPaid",
      label: "Amount paid",
      type: "number",
      hint:
        "Affiliate keys: payment you collected, in the smallest currency unit. 0 creates no payment; omit for a full payment.",
    },
  ],
  output: [
    { key: "booking", type: "object", label: "Created booking" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/availabilities/${
        pk(input.availabilityPk, "availabilityPk")
      }/bookings/`,
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
          lodging: input.lodging || undefined,
          rebooking: input.rebooking || undefined,
          amount_paid: input.amountPaid,
        },
      },
    );
  },
};

export default bookingCreate;
