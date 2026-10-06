import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  departmentId?: number;
  assigned?: boolean;
}

const referenceDataList: ActionDefinition<Input> = {
  key: "reference-data-list",
  type: "read",
  resource: "reference_data",
  title: "List Reference Data",
  description:
    "List reference data sets (the spreadsheet-like lookups behind dropdowns). Returns headers and column indexes, not rows.",
  params: [
    pageParam,
    departmentIdParam,
    {
      key: "assigned",
      label: "Assigned only",
      type: "boolean",
      hint: "Only reference data used by forms assigned to the user.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Reference data sets on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/reference_data", {
      page: input.page,
      department_id: input.departmentId,
      assigned: input.assigned,
    });
  },
};

export default referenceDataList;
