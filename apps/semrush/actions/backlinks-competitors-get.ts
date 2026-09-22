import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import {
  directionParam,
  fieldsParam,
  limitParam,
  offsetParam,
  orderByParam,
} from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/competitors` — the domains whose referring profiles overlap a target's.
 *
 * SEMrush's own definition, per the v4 reference: competitors are ranked by
 * **similarity**, the share of referring domains the two sites have in common.
 * It is a different question from a keyword-competitor list — shared link
 * sources rather than shared queries.
 *
 * Note the target parameter is `domain`, not `url`, and this endpoint takes no
 * `scope` at all: it compares whole domains.
 *
 * `data` is an array of `{common_refdomains, domain, similarity}`, where
 * `similarity` is a 0-1 float. Rows default to the most similar first
 * (`order_by=similarity`, `direction=DESC`).
 */
interface Input {
  domain: string;
  fields?: string[];
  order_by?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}

const backlinksCompetitorsGet: ActionDefinition<Input> = {
  key: "backlinks-competitors-get",
  type: "read",
  resource: "backlinks",
  title: "Get Backlink Competitors",
  description: "List the domains with referring profiles most similar to a target domain.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "A whole domain. This endpoint has no `scope` parameter — it always compares " +
        "domains, not subdomains or pages.",
    },
    fieldsParam,
    orderByParam("similarity"),
    directionParam,
    limitParam(100),
    offsetParam,
  ],
  output: [{ key: "data", type: "array", label: "Competitors, one row per domain" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/competitors", {
        query: {
          domain: input.domain,
          fields: input.fields,
          order_by: input.order_by,
          direction: input.direction,
          limit: input.limit,
          offset: input.offset,
        },
      });
    return { data: data ?? [] };
  },
};

export default backlinksCompetitorsGet;
