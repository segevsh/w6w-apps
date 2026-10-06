import type { ActionDefinition } from "@w6w/types";
import { compact, PAGE_PARAMS, RefinerClient } from "../lib/client.ts";

interface Input {
  list?: string;
  page?: number;
  pageLength?: number;
  includeInfo?: boolean;
  includeConfig?: boolean;
}

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Surveys",
  description: "List surveys (Refiner calls them forms), ordered by name.",
  params: [
    {
      key: "list",
      label: "State",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All (not archived)" },
        { value: "published", label: "Published" },
        { value: "drafts", label: "Drafts" },
        { value: "archived", label: "Archived" },
        { value: "all_with_archived", label: "All, including archived" },
      ],
    },
    ...PAGE_PARAMS,
    {
      key: "includeInfo",
      label: "Include metadata",
      type: "boolean",
      hint: "Adds channels, publish/creation dates, response and view counts, folder and link.",
    },
    {
      key: "includeConfig",
      label: "Include configuration",
      type: "boolean",
      hint: "Adds each survey's full configuration and elements. Large, and the format may change.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Surveys (uuid, name, …)" },
    { key: "pagination", type: "object", label: "Pagination block" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/forms", {
      query: compact({
        list: input.list,
        page: input.page,
        page_length: input.pageLength,
        include_info: input.includeInfo ? 1 : undefined,
        include_config: input.includeConfig ? 1 : undefined,
      }),
    });
  },
};

export default formList;
