import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/sites` — the account's sites.
 *
 * **Usually the first call a Kajabi workflow makes.** Almost every other
 * collection in this API takes `filter[site_id]`, and Kajabi says it is
 * "required when the account has multiple sites" — so this is where that id
 * comes from. A workflow that skips it and gets ambiguous results on a
 * multi-site account has found the one sharp edge in this API.
 *
 * Note what is *absent* from the parameter list: this is the only collection
 * with no `filter[site_id]`, because it is the thing being enumerated.
 */
interface Input {
  titleContains?: string;
  subdomainContains?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const siteList: ActionDefinition<Input> = {
  key: "site-list",
  type: "search",
  resource: "site",
  title: "List Sites",
  description:
    "List the sites on this Kajabi account. Use the returned id as the Site ID on the other " +
    "actions — Kajabi requires it once an account has more than one site.",
  params: [
    { key: "titleContains", label: "Title contains", type: "string" },
    { key: "subdomainContains", label: "Subdomain contains", type: "string" },
    sortParam("title, subdomain"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("sites", "title,subdomain"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/sites", {
      query: {
        "filter[title_cont]": unset(input.titleContains),
        "filter[subdomain_cont]": unset(input.subdomainContains),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[sites]": unset(input.fields),
      },
    });
  },
};

export default siteList;
