import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, encodeId } from "../lib/client.ts";

interface Input {
  id: string;
  skip?: number;
}

const crawlStatus: ActionDefinition<Input> = {
  key: "crawl-status",
  type: "read",
  resource: "crawl",
  title: "Get Crawl",
  description:
    "Get a crawl's status, progress counters and a page of results. Each page carries a " +
    "short-lived `contentUrl` to download its scraped content.",
  params: [
    { key: "id", label: "Crawl id", type: "string", required: true, placeholder: "crawl_abc123" },
    {
      key: "skip",
      label: "Skip pages",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Offset for pagination. Follow the returned `next` URL's skip value.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Crawl status" },
    { key: "total", type: "number", label: "Pages discovered" },
    { key: "completed", type: "number", label: "Pages done" },
    { key: "failed", type: "number", label: "Pages failed" },
    { key: "next", type: "string", label: "Next page URL, when more results remain" },
    { key: "data", type: "array", label: "Pages with metadata and contentUrl" },
  ],

  async execute(input, ctx) {
    if (!input.id?.trim()) throw new Error("Crawl id is required");
    return await new BrowserlessClient(ctx).json(`/crawl/${encodeId(input.id.trim())}`, {
      query: { skip: input.skip },
    });
  },
};

export default crawlStatus;
