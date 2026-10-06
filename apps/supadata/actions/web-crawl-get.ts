import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  jobId: string;
  skip?: number;
}

const webCrawlGet: ActionDefinition<Input> = {
  key: "web-crawl-get",
  type: "read",
  resource: "web",
  title: "Get Crawl",
  description:
    "Get a crawl's status (`scraping`, `completed`, `failed`, `cancelled`) and a page of results. " +
    "When `next` is returned, call again with Skip set to the `skip` value in that URL.",
  params: [
    { key: "jobId", label: "Crawl job id", type: "string", required: true },
    { key: "skip", label: "Skip pages", type: "number", validation: { integer: true, min: 0 } },
  ],
  output: [
    { key: "status", type: "string", label: "scraping, completed, failed or cancelled" },
    { key: "pages", type: "array", label: "Pages with url, name, content, countCharacters" },
    { key: "next", type: "string", label: "URL of the next page of results, when more remain" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json(
      `/web/crawl/${encodeId(requireText(input.jobId, "Crawl job id"))}`,
      { query: compact({ skip: input.skip }) },
    );
  },
};

export default webCrawlGet;
