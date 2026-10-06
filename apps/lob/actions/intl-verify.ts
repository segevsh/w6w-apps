import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";

interface Input {
  country: string;
  address?: string;
  recipient?: string;
  primaryLine?: string;
  secondaryLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  langOutput?: string;
}

const intlVerify: ActionDefinition<Input> = {
  key: "intl-verify",
  type: "read",
  resource: "verification",
  title: "Verify International Address",
  description:
    "Verify and standardize an address outside the US and US territories (use Verify US Address for those). Needs the country; pass separate fields or a free-form address. A test key returns a dummy response based on the primary line you send.",
  params: [
    {
      key: "country",
      label: "Country (ISO 3166-1 alpha-2)",
      type: "string",
      required: true,
      hint: "Two-letter code, e.g. GB, CA, DE.",
    },
    {
      key: "address",
      label: "Free-form address",
      type: "string",
      hint: "Use this OR the fields below, not both.",
    },
    { key: "recipient", label: "Recipient", type: "string" },
    { key: "primaryLine", label: "Primary line", type: "string" },
    { key: "secondaryLine", label: "Secondary line", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State / province", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    {
      key: "langOutput",
      label: "Output language",
      type: "select",
      advanced: true,
      options: [{ value: "native", label: "Native script" }, {
        value: "match",
        label: "Match the input language",
      }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Verification ID" },
    {
      key: "deliverability",
      type: "string",
      label: "deliverable | deliverable_missing_info | undeliverable | no_match",
    },
    { key: "status", type: "string", label: "Lob match-quality code (LV4 … LU1)" },
    { key: "primary_line", type: "string", label: "Standardized primary line" },
    { key: "last_line", type: "string", label: "Standardized last line" },
    { key: "country", type: "string", label: "Country" },
    { key: "components", type: "object", label: "Parsed components" },
  ],

  execute(input, ctx) {
    const split = compact({
      recipient: input.recipient,
      primary_line: input.primaryLine,
      secondary_line: input.secondaryLine,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
    });
    let body: Record<string, unknown>;
    if (input.address) {
      if (Object.keys(split).length > 0) {
        throw new Error("Use either the free-form address or the separate fields, not both");
      }
      body = { address: input.address, country: input.country };
    } else {
      if (!input.primaryLine) throw new Error("Primary line (or a free-form address) is required");
      body = { ...split, country: input.country };
    }
    return new LobClient(ctx).json("/intl_verifications", {
      method: "POST",
      headers: input.langOutput ? { "x-lang-output": input.langOutput } : undefined,
      body,
    });
  },
};

export default intlVerify;
