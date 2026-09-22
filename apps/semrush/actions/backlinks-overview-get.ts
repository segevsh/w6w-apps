import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import { fieldsParam, SCOPE_FULL, scopeParam } from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/overview` — a target's backlink profile, totalled.
 *
 * The one backlink call that costs a single API unit and answers "how big is
 * this profile", so it is the natural first call of any backlink workflow.
 *
 * `data` is an object of sixteen integer counters, as the vendor documents
 * them: `backlinks_count`, `domains_count`, `follows_count`, `forms_count`,
 * `frames_count`, `images_count`, `ip_class_c_count`, `ips_count`,
 * `lost_count`, `new_count`, `nofollows_count`, `score`, `sponsored_count`,
 * `texts_count`, `ugc_count`, `urls_count`.
 */
interface Input {
  url: string;
  scope: string;
  fields?: string[];
}

const backlinksOverviewGet: ActionDefinition<Input> = {
  key: "backlinks-overview-get",
  type: "read",
  resource: "backlinks",
  title: "Get Backlink Overview",
  description: "Read a target's backlink profile totals: links, domains, IPs and score.",
  params: [
    {
      key: "url",
      label: "Target",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "A domain, subdomain, subfolder or exact URL — `scope` says which one is meant.",
    },
    scopeParam(SCOPE_FULL),
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The profile totals" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<Record<string, number>>("/backlinks/v1/overview", {
        query: { url: input.url, scope: input.scope, fields: input.fields },
      });
    return { data };
  },
};

export default backlinksOverviewGet;
