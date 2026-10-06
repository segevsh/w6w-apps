import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  type?: "local" | "mobile" | "fixed" | "national" | "tollfree";
  numberStartsWith?: string;
  alias?: string;
  services?: "voice" | "sms" | "mms" | "voice,sms" | "voice,sms,mms";
  subaccount?: string;
  renewalDate?: string;
}

/** `GET /v1/Account/{auth_id}/Number/` — numbers already on the account. */
const listNumbers: ActionDefinition<Input> = {
  key: "list-numbers",
  type: "read",
  resource: "number",
  title: "List Account Phone Numbers",
  description: "List the phone numbers rented on (or added to) the account.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["local", "mobile", "fixed", "national", "tollfree"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "numberStartsWith", label: "Number starts with", type: "string" },
    { key: "alias", label: "Alias", type: "string", hint: "Exact match." },
    {
      key: "services",
      label: "Capabilities",
      type: "select",
      options: ["voice", "sms", "mms", "voice,sms", "voice,sms,mms"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "subaccount", label: "Subaccount Auth ID", type: "string" },
    { key: "renewalDate", label: "Renewal date", type: "string", hint: "YYYY-MM-DD." },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Account numbers" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Number/", {
      query: {
        type: input.type,
        number_startswith: input.numberStartsWith,
        alias: input.alias,
        services: input.services,
        subaccount: input.subaccount,
        renewal_date: input.renewalDate,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listNumbers;
