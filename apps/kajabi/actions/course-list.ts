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
 * `GET /v1/courses` — the course-shaped products.
 *
 * A narrower view than `product-list`: courses are one kind of product, and
 * Kajabi gives them their own collection with a `publish_status` filter that
 * the general product collection does not have.
 *
 * Read-only. The document declares `GET` on `/v1/courses` and
 * `/v1/courses/{id}` and nothing else — no endpoint creates a course, adds a
 * lesson, or marks progress. Course *authoring* is not part of this API, and
 * neither is learner progress; see the README's "Not covered" section.
 */
interface Input {
  siteId?: string;
  titleContains?: string;
  descriptionContains?: string;
  publishStatus?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const courseList: ActionDefinition<Input> = {
  key: "course-list",
  type: "search",
  resource: "course",
  title: "List Courses",
  description:
    "List a site's courses. Read-only — Kajabi's public API publishes no course authoring or " +
    "learner-progress endpoints.",
  params: [
    siteFilterParam,
    { key: "titleContains", label: "Title contains", type: "string" },
    {
      key: "descriptionContains",
      label: "Description contains",
      type: "string",
      advanced: true,
    },
    {
      key: "publishStatus",
      label: "Publish status",
      type: "string",
      hint: "Sent as `filter[publish_status_eq]`. Kajabi's documented example is `published`; " +
        "the spec publishes no full enum, so this is free text rather than a guessed list.",
    },
    sortParam("title"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("courses", "title"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/courses", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[title_cont]": unset(input.titleContains),
        "filter[description_cont]": unset(input.descriptionContains),
        "filter[publish_status_eq]": unset(input.publishStatus),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[courses]": unset(input.fields),
      },
    });
  },
};

export default courseList;
