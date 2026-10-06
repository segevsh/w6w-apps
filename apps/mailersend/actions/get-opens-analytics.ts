import type { ActionDefinition } from "@w6w/types";
import { dateParam, MailerSendClient, toList, toUnix } from "../lib/client.ts";

interface Input {
  breakdown: string;
  dateFrom: string | number;
  dateTo: string | number;
  domainId?: string;
  tags?: unknown;
}

const BREAKDOWNS = [
  { value: "country", label: "Country" },
  { value: "ua-name", label: "Browser / OS (user-agent name)" },
  { value: "ua-type", label: "Device type (user-agent type)" },
];

const getOpensAnalytics: ActionDefinition<Input> = {
  key: "get-opens-analytics",
  type: "read",
  resource: "analytics",
  title: "Get Opens Analytics",
  description:
    "Opens grouped by country, user-agent name or user-agent type (GET /v1/analytics/{country|ua-name|ua-type}). `data.stats` is a list of `{ name, count }`; for country, `name` is a two-letter code and is absent when there is no data.",
  params: [
    { key: "breakdown", label: "Group by", type: "select", required: true, options: BREAKDOWNS },
    dateParam("dateFrom", "Date from", true),
    dateParam("dateTo", "Date to", true),
    { key: "domainId", label: "Domain ID", type: "string" },
    { key: "tags", label: "Tags", type: "json" },
  ],
  output: [{ key: "data", type: "object", label: "`stats`: `{ name, count }` rows" }],

  execute(input, ctx) {
    if (!BREAKDOWNS.some((b) => b.value === input.breakdown)) {
      throw new Error(`unknown breakdown "${input.breakdown}"`);
    }
    return new MailerSendClient(ctx).json(`/analytics/${input.breakdown}`, {
      query: {
        domain_id: input.domainId,
        date_from: toUnix(input.dateFrom),
        date_to: toUnix(input.dateTo),
        tags: toList(input.tags),
      },
    });
  },
};

export default getOpensAnalytics;
