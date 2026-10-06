import type { ActionDefinition } from "@w6w/types";
import { requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
}

const webMap: ActionDefinition<Input> = {
  key: "web-map",
  type: "read",
  resource: "web",
  title: "Map Website",
  description: "List the URLs found on a whole website, for a sitemap or as a crawler's seed.",
  params: [{
    key: "url",
    label: "Site URL",
    type: "string",
    required: true,
    placeholder: "https://example.com",
  }],
  output: [{ key: "urls", type: "array", label: "URLs found" }],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/web/map", {
      query: { url: requireText(input.url, "Site URL") },
    });
  },
};

export default webMap;
