import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient } from "../lib/client.ts";

type Input = Record<string, unknown>;

/** `GET /v4/statistics` — `from` is required, format YYYY-MM-DDThh:mm:ss. */
const statisticsGet: ActionDefinition<Input> = {
  key: "statistics-get",
  type: "read",
  resource: "statistics",
  title: "Get Statistics",
  description: "Account-wide send statistics between two dates.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Start, YYYY-MM-DDThh:mm:ss (e.g. 2026-10-01T00:00:00).",
    },
    { key: "to", label: "To", type: "string", hint: "End, same format. Defaults to now." },
  ],
  output: [
    { key: "Recipients", type: "number", label: "Recipients" },
    { key: "EmailTotal", type: "number", label: "Emails" },
    { key: "Delivered", type: "number", label: "Delivered" },
    { key: "Bounced", type: "number", label: "Bounced" },
    { key: "Opened", type: "number", label: "Opened" },
    { key: "Clicked", type: "number", label: "Clicked" },
    { key: "Unsubscribed", type: "number", label: "Unsubscribed" },
    { key: "Complaints", type: "number", label: "Complaints" },
  ],
  async execute(input, ctx) {
    const from = String(input.from ?? "").trim();
    if (!from) throw new Error("From is required");
    return await new ElasticClient(ctx).json("/statistics", {
      query: compact({ from, to: input.to }) as Record<string, string>,
    });
  },
};

export default statisticsGet;
