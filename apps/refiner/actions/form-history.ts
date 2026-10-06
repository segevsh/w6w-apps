import type { ActionDefinition } from "@w6w/types";
import { compact, PAGE_PARAMS, RefinerClient } from "../lib/client.ts";

interface Input {
  formUuid: string;
  page?: number;
  pageLength?: number;
}

const formHistory: ActionDefinition<Input> = {
  key: "form-history",
  type: "read",
  resource: "form",
  title: "Get Survey Change Log",
  description:
    "List the previous versions of a survey. Each entry carries a full snapshot of its " +
    "configuration and questions.",
  params: [
    { key: "formUuid", label: "Survey UUID", type: "string", required: true },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Versions (uuid, action, snapshot, created_at)" },
    { key: "pagination", type: "object", label: "Pagination block" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/forms/history", {
      query: compact({
        form_uuid: input.formUuid,
        page: input.page,
        page_length: input.pageLength,
      }),
    });
  },
};

export default formHistory;
