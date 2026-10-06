import type { ActionDefinition } from "@w6w/types";
import { YouformClient } from "../lib/client.ts";

interface Input {
  page?: number;
}

/**
 * `GET /api/forms` — every form of the token's user. The list is a Laravel
 * paginator nested under `data`, so the rows are at `data.data`. The
 * collection documents no page-size parameter; `page` is Laravel's standard
 * paginator input and is only sent when set.
 */
const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List forms",
  description: "List the forms owned by the connected account.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Laravel paginator page number; omit for the first page.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Paginator: current_page and data[] (the forms, each with id, name, slug and fields)",
    },
  ],

  execute(input, ctx) {
    return new YouformClient(ctx).json("/forms", { query: { page: input.page } });
  },
};

export default formList;
