import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact } from "../lib/client.ts";

/**
 * Add Website Knowledge — Create a website knowledge item. Run Train Knowledge afterwards to crawl and index it.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  websiteUrl: string;
}

const knowledgeWebsiteCreate: ActionDefinition<Input> = {
  key: "knowledge-website-create",
  type: "perform",
  resource: "knowledge",
  title: "Add Website Knowledge",
  description:
    "Create a website knowledge item. Run Train Knowledge afterwards to crawl and index it.",
  idempotent: false,
  params: [
    {
      "key": "websiteUrl",
      "label": "Website URL",
      "type": "string",
      "required": true,
      "hint": "Must start with http:// or https://.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Knowledge item ID",
    },
    {
      "key": "type",
      "type": "string",
      "label": "website",
    },
    {
      "key": "base_url",
      "type": "string",
      "label": "Website URL",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/website`, {
      method: "POST",
      body: compact({ website_url: input.websiteUrl }),
    });
  },
};

export default knowledgeWebsiteCreate;
