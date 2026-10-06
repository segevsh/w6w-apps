import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient } from "../lib/client.ts";

/** `GET /api/analytics` — usage statistics. The answer is an array of per-group rows. */
interface Input {
  start?: string;
  end?: string;
  label?: string;
  subaccounts?: string;
  group_by?: string;
}

const analyticsGet: ActionDefinition<Input> = {
  key: "analytics-get",
  type: "read",
  resource: "account",
  title: "Get Usage Statistics",
  description:
    "Read SMS, RCS, voice, HLR, MNP and inbound counts and spend, grouped by date, label, subaccount or country.",
  params: [
    {
      key: "start",
      label: "Start date",
      type: "string",
      hint: "YYYY-MM-DD. Vendor default is 30 days ago.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "end",
      label: "End date",
      type: "string",
      hint: "YYYY-MM-DD. Vendor default is today.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: "A label, or `all` (the vendor default).",
    },
    {
      key: "subaccounts",
      label: "Subaccounts",
      type: "string",
      hint: "`only_main`, `all`, or one subaccount id.",
    },
    {
      key: "group_by",
      label: "Group by",
      type: "select",
      hint: "Vendor default is date.",
      options: [
        { value: "date", label: "Date" },
        { value: "label", label: "Label" },
        { value: "subaccount", label: "Subaccount" },
        { value: "country", label: "Country" },
      ],
    },
  ],
  output: [{ key: "rows", type: "array", label: "Usage rows" }],

  async execute(input, ctx) {
    const body = await new SevenClient(ctx).request("GET", "/analytics", {
      query: {
        start: input.start,
        end: input.end,
        label: input.label,
        subaccounts: input.subaccounts,
        group_by: input.group_by,
      },
    });
    return asObject(body, "rows");
  },
};

export default analyticsGet;
