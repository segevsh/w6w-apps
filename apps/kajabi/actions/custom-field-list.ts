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
 * `GET /v1/custom_fields` — what this site's custom fields actually mean.
 *
 * The companion to the `customFields` JSON param on `contact-create` and
 * `contact-update`. Kajabi's contact schema exposes three opaque slots —
 * `custom_1`, `custom_2`, `custom_3` — annotated only as *"Support depends on
 * custom fields of a site"*. This endpoint is how a workflow author discovers
 * what the site has defined them as, instead of guessing and writing a birthday
 * into the field that holds a T-shirt size.
 */
interface Input {
  siteId?: string;
  titleContains?: string;
  type?: string;
  required?: boolean;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List a site's custom field definitions — what `custom_1`, `custom_2` and `custom_3` mean " +
    "on this site's contacts.",
  params: [
    siteFilterParam,
    { key: "titleContains", label: "Title contains", type: "string" },
    {
      key: "type",
      label: "Field type",
      type: "string",
      hint: "Sent as `filter[type_eq]`. Kajabi's example value is `TextField`.",
    },
    { key: "required", label: "Required only", type: "boolean", advanced: true },
    sortParam("title, handle, type, required"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("custom_fields", "title,handle"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/custom_fields", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[title_cont]": unset(input.titleContains),
        "filter[type_eq]": unset(input.type),
        "filter[required_eq]": input.required,
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[custom_fields]": unset(input.fields),
      },
    });
  },
};

export default customFieldList;
