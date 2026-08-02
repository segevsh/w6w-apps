import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
  page?: number;
  perPage?: number;
}

/** GET /surveys/{id}/pages — list a survey's pages (id, title, position, question count). */
const pageGetMany: ActionDefinition<Input> = {
  key: "page-get-many",
  type: "read",
  resource: "page",
  title: "Get Many Survey Pages",
  description: "List the pages that make up a survey's design.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
    { key: "page", label: "Page", type: "number", hint: "1-based page number. Default 1." },
    { key: "perPage", label: "Page size", type: "number" },
  ],
  output: [
    { key: "data", type: "array", label: "Pages" },
    { key: "total", type: "number", label: "Total items" },
    { key: "page", type: "number", label: "Current page" },
    { key: "per_page", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/pages`,
      { query: { page: input.page, per_page: input.perPage } },
    );
  },
};

export default pageGetMany;
