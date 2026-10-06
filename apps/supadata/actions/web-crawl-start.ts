import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
  limit?: number;
}

const webCrawlStart: ActionDefinition<Input> = {
  key: "web-crawl-start",
  type: "perform",
  idempotent: false,
  resource: "web",
  title: "Start Crawl",
  description:
    "Start an asynchronous crawl that extracts the content of every page on a website. Returns a " +
    "job id to poll with Get Crawl. 1 credit per crawled page.",
  params: [
    {
      key: "url",
      label: "Start URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    {
      key: "limit",
      label: "Max pages",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 5000 },
    },
  ],
  output: [{ key: "jobId", type: "string", label: "Crawl job id" }],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/web/crawl", {
      method: "POST",
      body: compact({ url: requireText(input.url, "Start URL"), limit: input.limit }),
    });
  },
};

export default webCrawlStart;
