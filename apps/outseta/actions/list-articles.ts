import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  q?: string;
}

/** `GET /api/v1/support/articles` — List knowledge base articles, optionally matching title or body text. */
const listArticles: ActionDefinition<Input> = {
  key: "list-articles",
  type: "search",
  resource: "support",
  title: "List Knowledge Base Articles",
  description: "List knowledge base articles, optionally matching title or body text.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches the article title or body.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/support/articles`, {
      method: "GET",
      query: { ...pageQuery(input), q: input.q },
    });
  },
};

export default listArticles;
