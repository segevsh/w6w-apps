import type { ActionDefinition } from "@w6w/types";
import { compact, PAGE_PARAMS, RefinerClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageLength?: number;
}

const segmentList: ActionDefinition<Input> = {
  key: "segment-list",
  type: "search",
  resource: "segment",
  title: "List Segments",
  description:
    "List user segments ordered by name. `is_manual` marks the ones you can add users to.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "items", type: "array", label: "Segments (uuid, name, is_manual)" },
    { key: "pagination", type: "object", label: "Pagination block" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/segments", {
      query: compact({ page: input.page, page_length: input.pageLength }),
    });
  },
};

export default segmentList;
