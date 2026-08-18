import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/addresses/create_and_verify` — check an address is real before
 * shipping to it.
 *
 * ## The cheapest step in the whole pipeline
 *
 * A wrong address is not caught at purchase. The label is bought, the parcel
 * moves, and days later it comes back — with the postage spent, the customer
 * waiting, and a return to process. Verifying costs one call and happens before
 * any of that.
 *
 * ## Verification corrects as well as validates
 *
 * The response is the address **as the postal service holds it**: standardised
 * street abbreviations, corrected casing, and the full ZIP+4 rather than the
 * five digits somebody typed. Shipping to the corrected version is what you
 * want — carriers rate on it, and a mismatched ZIP can change the price.
 *
 * So this returns `verifiedAddress` alongside the raw object, and reports
 * `changed` when the corrected version differs from what was submitted, which
 * is worth showing a human before it goes on a parcel.
 *
 * ## Failures are informative, and are not exceptions
 *
 * An address that cannot be verified comes back with `verifications.delivery`
 * unsuccessful and an error naming why — unknown street, missing apartment
 * number. That is a result rather than a fault, so this returns it as
 * `verified: false` with the reasons rather than throwing.
 */
const action: ActionDefinition = {
  key: "address-verify",
  type: "perform",
  resource: "address",
  title: "Verify an address",
  description:
    "Check an address exists and get it back as the postal service holds it — standardised, with " +
    "the full ZIP+4. One call, before a wrong address costs a label and a return.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "company", label: "Company", type: "string", default: "" },
    { key: "street1", label: "Street", type: "string", required: true, default: "" },
    { key: "street2", label: "Street 2", type: "string", default: "" },
    { key: "city", label: "City", type: "string", default: "" },
    { key: "state", label: "State", type: "string", default: "" },
    {
      key: "zip",
      label: "Postal Code",
      type: "string",
      default: "",
      hint: "Five digits is enough — verification returns the full ZIP+4, which is what carriers " +
        "rate on.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      default: "US",
      hint: "Two-letter code. Verification coverage outside the US varies by country.",
    },
    { key: "phone", label: "Phone", type: "string", default: "", advanced: true },
    { key: "email", label: "Email", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Address ID — reusable in a shipment" },
    { key: "verified", type: "boolean", label: "Whether delivery verification succeeded" },
    { key: "changed", type: "boolean", label: "Whether the corrected address differs" },
    { key: "verifiedAddress", type: "object", label: "The address as the postal service holds it" },
    { key: "verificationErrors", type: "array", label: "Why it failed, when it did" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const street1 = String(p.street1 ?? "").trim();
    if (!street1) throw new Error("`street1` is required");

    const submitted = compact({
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
    });

    const address = await new EasyPostClient(ctx).request<{
      id?: string;
      street1?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      verifications?: {
        delivery?: {
          success?: boolean;
          errors?: Array<{ field?: string; message?: string; suggestion?: string }>;
        };
      };
    }>("/addresses/create_and_verify", {
      method: "POST",
      wrapIn: "address",
      body: submitted,
    });

    const delivery = address?.verifications?.delivery;
    const verifiedAddress = {
      street1: address?.street1,
      street2: address?.street2,
      city: address?.city,
      state: address?.state,
      zip: address?.zip,
      country: address?.country,
    };
    // A correction is worth showing a human before it goes on a parcel.
    const changed = ["street1", "city", "state", "zip"].some((k) => {
      const before = String((submitted as Record<string, unknown>)[k] ?? "").trim().toUpperCase();
      const after = String((verifiedAddress as Record<string, unknown>)[k] ?? "").trim()
        .toUpperCase();
      return before !== "" && after !== "" && before !== after;
    });

    // The id and the outcome — never the address, which is somebody's home.
    ctx.log("info", "verified an address with EasyPost", {
      addressId: address?.id,
      verified: delivery?.success === true,
      changed,
    });

    return {
      ...address,
      verified: delivery?.success === true,
      changed,
      verifiedAddress,
      verificationErrors: delivery?.errors ?? [],
    };
  },
};

export default action;
