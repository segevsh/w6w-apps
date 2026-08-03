import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/** `GET /v1/forms` — the site's opt-in and lead forms. */
interface Input {
  siteId?: string;
  titleContains?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List a site's forms. The ids feed `form-submit` and the submission filters.",
  params: [
    siteFilterParam,
    { key: "titleContains", label: "Title contains", type: "string" },
    sortParam("title"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("forms", "title"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/forms", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[title_cont]": unset(input.titleContains),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[forms]": unset(input.fields),
      },
    });
  },
};

export default formList;
