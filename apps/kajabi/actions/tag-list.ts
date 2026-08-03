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

/**
 * `GET /v1/contact_tags` — the site's tag vocabulary.
 *
 * The lookup table behind `contact-tag-add`, `contact-tag-remove` and
 * `contact-list`'s tag filters, all of which take numeric ids rather than
 * names. Resolving a name to an id here is the normal first step.
 *
 * ## No tag write endpoints exist
 *
 * The document declares `GET /v1/contact_tags` and `GET
 * /v1/contact_tags/{id}` and nothing else — no POST, PATCH or DELETE. So tags
 * can be *applied* to contacts through this app but not *created*; a tag has to
 * exist in Kajabi first. That asymmetry is the vendor's, and inventing a
 * create action for it would mean guessing at an endpoint that is not
 * published.
 *
 * (The `sort` parameter's documented values are "name, email" — `email` on a
 * tag is almost certainly copy-paste from the contact collection. Only `name`
 * is quoted in this action's hint, since that is the one that plainly applies.)
 */
interface Input {
  siteId?: string;
  nameContains?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description:
    "List the contact tags defined on a site. Use this to turn a tag name into the id that " +
    "the tagging and filtering actions require.",
  params: [
    siteFilterParam,
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      hint: "Sent as `filter[name_cont]`.",
    },
    sortParam("name"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("contact_tags", "name"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/contact_tags", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[name_cont]": unset(input.nameContains),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[contact_tags]": unset(input.fields),
      },
    });
  },
};

export default tagList;
