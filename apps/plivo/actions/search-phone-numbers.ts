import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  countryIso: string;
  type?: "local" | "tollfree" | "mobile" | "national" | "fixed";
  pattern?: string;
  services?: "voice" | "sms" | "mms" | "voice,sms" | "voice,sms,mms";
  region?: string;
  city?: string;
  npanxx?: number;
  lata?: number;
  rateCenter?: string;
}

/**
 * `GET /v1/Account/{auth_id}/PhoneNumber/` — numbers available to rent from
 * Plivo's inventory (not the numbers you already own: that is `list-numbers`,
 * on the different `/Number/` path). `region` applies to `fixed` numbers only,
 * `city` to `local` only, and `npanxx`/`lata`/`rate_center` to US and Canada.
 */
const searchPhoneNumbers: ActionDefinition<Input> = {
  key: "search-phone-numbers",
  type: "search",
  resource: "number",
  title: "Search Available Phone Numbers",
  description: "Search Plivo's inventory for numbers that can be rented.",
  params: [
    {
      key: "countryIso",
      label: "Country (ISO)",
      type: "string",
      required: true,
      placeholder: "US",
      hint: "ISO 3166 alpha-2 country code.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["local", "tollfree", "mobile", "national", "fixed"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "pattern",
      label: "Pattern",
      type: "string",
      hint: "Digits the number should start with, e.g. 415 returns numbers starting 1415.",
    },
    {
      key: "services",
      label: "Capabilities",
      type: "select",
      options: ["voice", "sms", "mms", "voice,sms", "voice,sms,mms"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "region",
      label: "Region",
      type: "string",
      hint: "`fixed` numbers only, e.g. Frankfurt.",
    },
    { key: "city", label: "City", type: "string", hint: "`local` numbers only." },
    {
      key: "npanxx",
      label: "NPA-NXX",
      type: "number",
      hint: "Six-digit prefix. US and Canada only.",
    },
    { key: "lata", label: "LATA", type: "number", hint: "US and Canada only." },
    { key: "rateCenter", label: "Rate center", type: "string", hint: "US and Canada only." },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Available numbers" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("PhoneNumber/", {
      query: {
        country_iso: input.countryIso,
        type: input.type,
        pattern: input.pattern,
        services: input.services,
        region: input.region,
        city: input.city,
        npanxx: input.npanxx,
        lata: input.lata,
        rate_center: input.rateCenter,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default searchPhoneNumbers;
