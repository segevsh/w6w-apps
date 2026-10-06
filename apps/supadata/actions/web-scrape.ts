import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
  noLinks?: boolean;
  lang?: string;
}

const webScrape: ActionDefinition<Input> = {
  key: "web-scrape",
  type: "read",
  resource: "web",
  title: "Scrape Web Page",
  description: "Extract the content of any web page as Markdown. 1 credit.",
  params: [
    {
      key: "url",
      label: "Page URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    {
      key: "noLinks",
      label: "Strip links",
      type: "boolean",
      default: false,
      hint: "Remove links from the Markdown.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      hint: "Preferred page language (vendor default `en`).",
    },
  ],
  output: [
    { key: "url", type: "string", label: "Scraped URL" },
    { key: "name", type: "string", label: "Page title" },
    { key: "ogUrl", type: "string", label: "Open Graph URL" },
    { key: "content", type: "string", label: "Markdown content" },
    { key: "countCharacters", type: "number", label: "Content length" },
    { key: "urls", type: "array", label: "Links found on the page" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/web/scrape", {
      query: compact({
        url: requireText(input.url, "Page URL"),
        noLinks: input.noLinks || undefined,
        lang: input.lang?.trim(),
      }),
    });
  },
};

export default webScrape;
