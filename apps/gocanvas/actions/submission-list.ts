import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient, requireOneOf } from "../lib/client.ts";
import { departmentIdParam, optionalIdParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  formId?: number;
  departmentId?: number;
  userId?: number;
  userEmail?: string;
  status?: string;
  handOff?: string;
  customStatus?: string;
  startDate?: string;
  endDate?: string;
}

const submissionList: ActionDefinition<Input> = {
  key: "submission-list",
  type: "read",
  resource: "submission",
  title: "List Submissions",
  description:
    "List submissions. One of form id, user id or user email is required; the form id matches every version of the form. Defaults to completed submissions.",
  params: [
    pageParam,
    optionalIdParam("formId", "Form ID"),
    departmentIdParam,
    optionalIdParam("userId", "User ID"),
    {
      key: "userEmail",
      label: "User email",
      type: "string",
      hint: "Cannot be combined with User ID.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "completed", label: "completed" },
        { value: "all", label: "all" },
        { value: "deleted", label: "deleted" },
        { value: "in-progress", label: "in-progress" },
        { value: "overdue", label: "overdue" },
        { value: "rejected", label: "rejected" },
        { value: "handed-off", label: "handed-off" },
        { value: "assigned", label: "assigned" },
        { value: "unassigned", label: "unassigned" },
        { value: "custom", label: "custom" },
        { value: "saved-to-cloud", label: "saved-to-cloud" },
        { value: "unfinished", label: "unfinished" },
      ],
    },
    {
      key: "handOff",
      label: "Handoff state",
      type: "string",
      hint: "The workflow handoff state name; required for status handed-off.",
    },
    {
      key: "customStatus",
      label: "Custom status",
      type: "string",
      hint: "The custom status label; required for status custom.",
    },
    {
      key: "startDate",
      label: "Created after",
      type: "string",
      hint: "ISO-8601 lower bound on created_at.",
    },
    {
      key: "endDate",
      label: "Created before",
      type: "string",
      hint: "ISO-8601 upper bound on created_at.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Submissions on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    requireOneOf(
      input as unknown as Record<string, unknown>,
      ["formId", "userId", "userEmail"],
      "submission-list",
    );
    if (input.userId !== undefined && input.userEmail) {
      throw new Error("userId and userEmail cannot be combined; provide only one");
    }
    return new GoCanvasClient(ctx).list("/submissions", {
      page: input.page,
      form_id: input.formId,
      department_id: input.departmentId,
      user_id: input.userId,
      user_email: input.userEmail,
      status: input.status,
      hand_off: input.handOff,
      custom_status: input.customStatus,
      start_date: input.startDate,
      end_date: input.endDate,
    });
  },
};

export default submissionList;
