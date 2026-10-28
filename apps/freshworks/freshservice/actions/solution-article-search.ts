import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm: string;
  userEmail?: string;
  page?: number;
  perPage?: number;
}

const solutionArticleSearch: ActionDefinition<Input> = {
  key: "solution-article-search",
  type: "search",
  resource: "solution-article",
  title: "Search Solution Articles",
  description:
    "Search the knowledge base. Returns only PUBLISHED articles the credential's own user can see.",
  params: [
    {
      key: "searchTerm",
      label: "Search term",
      type: "string",
      required: true,
      placeholder: "vpn issue",
    },
    {
      key: "userEmail",
      label: "Search as user",
      type: "string",
      advanced: true,
      hint:
        "Search on another user's behalf. The API key's user needs impersonation rights, or Freshservice answers 403.",
    },
    ...pagination,
  ],
  output: [{ key: "articles", type: "array", label: "Articles" }],

  async execute(input, ctx) {
    const articles = await new FreshserviceClient(ctx).resource<unknown[]>(
      "articles",
      "/solutions/articles/search",
      {
        query: {
          search_term: input.searchTerm,
          user_email: unset(input.userEmail),
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return { articles };
  },
};

export default solutionArticleSearch;
