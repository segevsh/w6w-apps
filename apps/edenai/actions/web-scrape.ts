import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `web/scraping/{provider}`. */
interface Input {
  url: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "web-scrape",
  title: "Scrape Web Page",
  description: "Fetch one URL and return its content as text, with title, links and images.",
  feature: "web",
  subfeature: "scraping",
  defaultProvider: "firecrawl",
  providerHint: "Provider such as firecrawl, linkup or tavily.",
  params: [
    { key: "url", label: "URL", type: "string", required: true },
  ],
  buildInput: (i) => ({ url: i.url }),
  promote: [{ key: "content", type: "string", label: "Page content" }, {
    key: "title",
    type: "string",
    label: "Title",
  }],
});
