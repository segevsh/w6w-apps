import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient, requireOneOf } from "../lib/client.ts";
import { departmentIdParam, optionalIdParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  userId?: number;
  departmentId?: number;
  formId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
}

const dispatchList: ActionDefinition<Input> = {
  key: "dispatch-list",
  type: "read",
  resource: "dispatch",
  title: "List Dispatches",
  description: "List dispatches. One of user id, department id or form id is required.",
  params: [
    pageParam,
    optionalIdParam("userId", "Assigned user ID"),
    departmentIdParam,
    optionalIdParam("formId", "Form ID"),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "unassigned", label: "unassigned" },
        { value: "assigned", label: "assigned" },
        { value: "received", label: "received" },
        { value: "ready", label: "ready" },
      ],
    },
    { key: "startDate", label: "Created after", type: "string", hint: "ISO-8601." },
    { key: "endDate", label: "Created before", type: "string", hint: "ISO-8601." },
    { key: "scheduledStartDate", label: "Scheduled after", type: "string", hint: "ISO-8601." },
    { key: "scheduledEndDate", label: "Scheduled before", type: "string", hint: "ISO-8601." },
  ],
  output: [
    { key: "items", type: "array", label: "Dispatches on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    requireOneOf(
      input as unknown as Record<string, unknown>,
      ["userId", "departmentId", "formId"],
      "dispatch-list",
    );
    return new GoCanvasClient(ctx).list("/dispatches", {
      page: input.page,
      user_id: input.userId,
      department_id: input.departmentId,
      form_id: input.formId,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      scheduled_start_date: input.scheduledStartDate,
      scheduled_end_date: input.scheduledEndDate,
    });
  },
};

export default dispatchList;
