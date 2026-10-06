import type { ActionDefinition } from "@w6w/types";
import { EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/keywords` — the account's purchased keywords, `{id, keyword}` each. */
interface Input {
  page?: number;
  size?: string;
  sort?: string;
}

const keywordList: ActionDefinition<Input> = {
  key: "keyword-list",
  type: "search",
  resource: "keyword",
  title: "List Keywords",
  description: "List the keywords the account has purchased.",
  params: [...paginationParams(), sortParam()],
  output: pageOutput("Keywords"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/keywords", {
      query: { page: input.page, size: input.size, sort: input.sort },
    });
  },
};

export default keywordList;
