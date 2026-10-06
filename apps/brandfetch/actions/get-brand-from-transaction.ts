import type { ActionDefinition } from "@w6w/types";
import { BrandfetchClient } from "../lib/client.ts";
import { BRAND_OUTPUT, brandOutput } from "../lib/brand.ts";

interface Input {
  transactionLabel: string;
  countryCode: string;
}

/**
 * `POST /v2/brands/transaction` — the Transaction API. It is a lookup, not a
 * write, so it is a `read`. A 404 here means the label matched a domain but there
 * is no brand data; like a 200 it consumes a credit.
 */
const getBrandFromTransaction: ActionDefinition<Input> = {
  key: "get-brand-from-transaction",
  type: "read",
  resource: "brand",
  title: "Get Brand from Transaction",
  description: 'Resolve a raw card or bank transaction label (e.g. "AMZN Mktp US*2K4") to the ' +
    "merchant's brand: name, domain, logos and company data. Billed per call.",
  params: [
    {
      key: "transactionLabel",
      label: "Transaction label",
      type: "string",
      required: true,
      hint: "The raw transaction text as it appears on the statement.",
    },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      required: true,
      hint: "ISO 3166-1 alpha-2 country where the transaction took place, e.g. US.",
      validation: { pattern: "^[A-Za-z]{2}$" },
    },
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    const result = await new BrandfetchClient(ctx).request("/v2/brands/transaction", {
      body: {
        transactionLabel: input.transactionLabel,
        countryCode: input.countryCode.trim().toUpperCase(),
      },
    });
    return brandOutput(result);
  },
};

export default getBrandFromTransaction;
