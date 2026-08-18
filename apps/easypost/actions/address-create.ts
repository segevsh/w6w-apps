import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/addresses` — store an address for reuse, without verifying it.
 *
 * The counterpart to `address-verify`, for the address you already trust: a
 * warehouse, a returns centre, the origin every shipment leaves from. Creating
 * it once and passing its id to `shipment-create` is one fewer object per
 * shipment.
 *
 * It is deliberately separate from verification rather than a flag on it,
 * because the two have opposite defaults in practice. **A customer's address
 * should always be verified** — it came from a form and may be wrong. **Your
 * own warehouse should not need to be**, every time, for the rest of the
 * company's life.
 *
 * `residential` is the field people forget. Carriers charge a surcharge for
 * residential delivery and will apply it whether or not the address is marked,
 * so a rate quoted for a commercial address that turns out to be a house
 * arrives as an adjustment on the invoice weeks later.
 */
const action: ActionDefinition = {
  key: "address-create",
  type: "perform",
  resource: "address",
  title: "Create an address",
  description:
    "Store an address for reuse without verifying it — for your own warehouse. A customer's " +
    "address came from a form and should go through `address-verify` instead.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "company", label: "Company", type: "string", default: "" },
    { key: "street1", label: "Street", type: "string", required: true, default: "" },
    { key: "street2", label: "Street 2", type: "string", default: "" },
    { key: "city", label: "City", type: "string", default: "" },
    { key: "state", label: "State", type: "string", default: "" },
    { key: "zip", label: "Postal Code", type: "string", default: "" },
    { key: "country", label: "Country", type: "string", default: "US" },
    { key: "phone", label: "Phone", type: "string", default: "" },
    { key: "email", label: "Email", type: "string", default: "", advanced: true },
    {
      key: "residential",
      label: "Residential",
      type: "boolean",
      default: false,
      hint: "Carriers surcharge residential delivery whether or not you declare it — an " +
        "undeclared house arrives as an invoice adjustment weeks later.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Address ID — pass this to `shipment-create`" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const street1 = String(p.street1 ?? "").trim();
    if (!street1) throw new Error("`street1` is required");

    const address = await new EasyPostClient(ctx).request<{ id?: string }>("/addresses", {
      method: "POST",
      wrapIn: "address",
      body: compact({
        name: p.name,
        company: p.company,
        street1,
        street2: p.street2,
        city: p.city,
        state: p.state,
        zip: p.zip,
        country: p.country === undefined ? "US" : p.country,
        phone: p.phone,
        email: p.email,
        residential: p.residential === true ? true : undefined,
      }),
    });

    // The id only — an address is somebody's home.
    ctx.log("info", "created an EasyPost address", { addressId: address?.id });
    return address;
  },
};

export default action;
