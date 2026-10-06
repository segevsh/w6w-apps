import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId, parseJson, reqString } from "../lib/client.ts";

interface Input {
  name: string;
  customersId: number | string;
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

const createProject: ActionDefinition<Input> = {
  key: "create-project",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project under a customer (POST /v4/projects). `name` and `customersId` are required.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
      required: true,
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
    { key: "data", type: "object", label: "The created project" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const budget = input.budget === undefined || input.budget === ""
      ? undefined
      : parseJson(input.budget, "budget");
    if (
      budget !== undefined &&
      (budget === null || typeof budget !== "object" || Array.isArray(budget))
    ) {
      throw new Error("budget must be an object");
    }
    const body = await new ClockodoClient(ctx).call("/v4/projects", {
      body: compact({
        name: reqString(input.name, "name"),
        customers_id: intId(input.customersId, "customersId"),
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
      }),
    });
    return { data: body.data ?? null };
  },
};

export default createProject;
