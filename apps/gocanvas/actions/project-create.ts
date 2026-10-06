import type { ActionDefinition } from "@w6w/types";
import { compact, GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  name: string;
  departmentId?: number;
  customerId?: number;
  siteId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  notes?: string;
  code?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project. Only the name is required; without a department the user's default department is used.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    departmentIdParam,
    optionalIdParam(
      "customerId",
      "Customer ID",
      "The customer and site must be associated with each other.",
    ),
    optionalIdParam("siteId", "Site ID"),
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "ISO-8601, e.g. 2024-01-30 or 2024-01-30T23:59:59-04:00.",
    },
    { key: "endDate", label: "End date", type: "string", hint: "ISO-8601." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }, {
        value: "draft",
        label: "draft",
      }],
    },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "code",
      label: "Code",
      type: "string",
      hint: "An alphanumeric code that uniquely identifies the project.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created project" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request("/projects", {
      method: "POST",
      body: compact({
        name: input.name,
        department_id: input.departmentId,
        customer_id: input.customerId,
        site_id: input.siteId,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status,
        notes: input.notes,
        code: input.code,
      }),
    });
  },
};

export default projectCreate;
