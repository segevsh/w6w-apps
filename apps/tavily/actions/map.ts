import type { ActionDefinition } from "@w6w/types";
import { TavilyClient } from "../lib/client.ts";
import { siteBody, type SiteFilterInput, siteParams } from "../lib/params.ts";

/** `POST /map` — discover a site's URL structure without extracting page content. */
const map: ActionDefinition<SiteFilterInput> = {
  key: "map",
  type: "read",
  resource: "site",
  title: "Map Site",
  description: "Traverse a website and return the list of URLs found, without page content.",
  params: siteParams(),
  output: [
    { key: "base_url", type: "string", label: "Base URL" },
    { key: "results", type: "array", label: "URLs" },
    { key: "response_time", type: "number", label: "Response time (s)" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new TavilyClient(ctx).post("/map", siteBody(input));
  },
};

export default map;
