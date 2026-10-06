import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath, mapDatapoint } from "../lib/client.ts";
import { SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  sort?: string;
  count?: number;
  page?: number;
  per?: number;
}

/** `GET /users/u/goals/g/datapoints.json` */
const listDatapoints: ActionDefinition<Input> = {
  key: "list-datapoints",
  type: "read",
  resource: "datapoint",
  title: "List Datapoints",
  description: "List a goal's datapoints, newest first by id unless sorted. Use `count` for the " +
    "latest n, or `page` + `per` to paginate (page 1 is the first page).",
  params: [
    USERNAME,
    SLUG,
    {
      key: "sort",
      label: "Sort attribute (descending)",
      type: "string",
      hint: "e.g. timestamp, updated_at. Vendor default: id.",
    },
    {
      key: "count",
      label: "Limit",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Ignored when `page` is set.",
    },
    {
      key: "page",
      label: "Page (1-indexed)",
      type: "number",
      validation: { min: 1, integer: true },
    },
    {
      key: "per",
      label: "Per page",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Default 25; ignored without `page`.",
    },
  ],
  output: [
    { key: "datapoints", type: "array", label: "Datapoints" },
    { key: "count", type: "number", label: "Number returned" },
  ],

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}/datapoints.json`,
      { query: { sort: input.sort, count: input.count, page: input.page, per: input.per } },
    );
    const list = Array.isArray(data) ? data : [];
    return { datapoints: list.map(mapDatapoint), count: list.length };
  },
};

export default listDatapoints;
