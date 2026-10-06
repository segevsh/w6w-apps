import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam, pageParam } from "../lib/params.ts";

interface Input {
  formId: number;
  page?: number;
}

const formReportList: ActionDefinition<Input> = {
  key: "form-report-list",
  type: "read",
  resource: "form",
  title: "List Form Reports",
  description: "List the report definitions attached to a form.",
  params: [
    idParam("formId", "Form ID"),
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Report definitions" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list(`/forms/${encodeId(input.formId)}/reports`, {
      page: input.page,
    });
  },
};

export default formReportList;
