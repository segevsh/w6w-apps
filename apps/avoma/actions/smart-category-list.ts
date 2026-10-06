import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { nextParam, pageOutput } from "../lib/params.ts";

/**
 * `GET /v1/smart_categories/` — the organization's smart categories, with their keywords,
 * prompts and note settings. Only `o` (ordering) is documented as a parameter — no
 * `page_size` — so none is offered; follow `next` for further pages.
 */
interface Input {
  order?: string;
  next?: string;
}

const smartCategoryList: ActionDefinition<Input> = {
  key: "smart-category-list",
  type: "search",
  resource: "smart-category",
  title: "List Smart Categories",
  description: "List the organization's smart categories (keywords, prompts and AI-note " +
    "settings used to tag and extract notes).",
  params: [
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "name", label: "Name (A-Z)" },
        { value: "-name", label: "Name (Z-A)" },
        { value: "-modified", label: "Recently modified first" },
        { value: "modified", label: "Least recently modified first" },
        { value: "-start_at", label: "Newest first" },
        { value: "start_at", label: "Oldest first" },
      ],
    },
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new AvomaClient(ctx).list("/v1/smart_categories/", { o: input.order }, input.next);
  },
};

export default smartCategoryList;
