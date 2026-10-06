import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  date: string;
}

/** `GET /site-explorer/domain-rating` — response key `domain_rating`. */
const domainRatingGet: ActionDefinition<Input> = {
  key: "domain-rating-get",
  type: "read",
  resource: "domain",
  title: "Get Domain Rating",
  description: "Domain Rating and Ahrefs Rank of a domain or URL on a date.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "The domain or URL to analyse, e.g. `example.com` or `example.com/blog/`.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Report date, `YYYY-MM-DD`.",
    },
  ],
  output: [
    { key: "domain_rating", type: "object", label: "Domain Rating and Ahrefs Rank" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/domain-rating", {
      target: input.target,
      date: input.date,
    });
  },
};

export default domainRatingGet;
