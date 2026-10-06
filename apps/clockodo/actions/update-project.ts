import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId, optInt, parseJson } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  customersId?: number | string;
  number?: string;
  active?: boolean;
  billableDefault?: boolean;
  note?: string;
  deadline?: string;
  startDate?: string;
  automaticCompletion?: boolean;
  budget?: unknown;
  serviceAssignments?: unknown;
}

const updateProject: ActionDefinition<Input> = {
  key: "update-project",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description:
    "Edit a project (PUT /v4/projects/{id}). Only the fields you pass are sent; at least one is required.",
  params: [
    {
      key: "id",
      label: "Project ID",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
    },
    {
      key: "number",
      label: "Number",
      type: "string",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
    },
    {
      key: "billableDefault",
      label: "Billable by default",
      type: "boolean",
    },
    {
      key: "note",
      label: "Note",
      type: "string",
    },
    {
      key: "deadline",
      label: "Deadline",
      type: "string",
      hint: "YYYY-MM-DD; the project completes automatically then.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "YYYY-MM-DD.",
    },
    {
      key: "automaticCompletion",
      label: "Automatic completion",
      type: "boolean",
    },
    {
      key: "budget",
      label: "Budget",
      type: "json",
      hint:
        "Object: { amount, monetary, hard, interval (0 weekly, 1 monthly, 2 quarterly, 3 yearly), from_subprojects, notification_thresholds }.",
    },
    {
      key: "serviceAssignments",
      label: "Service IDs",
      type: "json",
      hint: "Array of service ids this project is limited to.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated project" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const budget = input.budget === undefined || input.budget === ""
      ? undefined
      : parseJson(input.budget, "budget");
    if (
      budget !== undefined &&
      (budget === null || typeof budget !== "object" || Array.isArray(budget))
    ) {
      throw new Error("budget must be an object");
    }
    const fields = compact({
      name: input.name,
      customers_id: optInt(input.customersId, "customersId"),
      number: input.number,
      active: input.active,
      billable_default: input.billableDefault,
      note: input.note,
      deadline: input.deadline,
      start_date: input.startDate,
      automatic_completion: input.automaticCompletion,
      budget,
      service_assignments: input.serviceAssignments === undefined
        ? undefined
        : parseJson(input.serviceAssignments, "serviceAssignments"),
    });
    if (Object.keys(fields).length === 0) throw new Error("pass at least one field to update");
    const body = await new ClockodoClient(ctx).call(`/v4/projects/${id}`, {
      method: "PUT",
      body: fields,
    });
    return { data: body.data ?? null };
  },
};

export default updateProject;
