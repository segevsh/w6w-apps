import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { requireDate, requireString } from "../lib/params.ts";

interface Input {
  email: string;
  firstName: string;
  surname: string;
  site: string;
  startDate: string;
  department?: string;
  title?: string;
}

/**
 * `POST /v1/people` — create an employee. The documented minimum is email, first
 * name, surname and `work.site` + `work.startDate`; department and title are the
 * only other documented create fields. Needs the "Add new people to the company"
 * feature permission on the service user. Creating a duplicate is a 400.
 */
const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  idempotent: false,
  resource: "employee",
  title: "Create Employee",
  description: "Create a new employee record in Bob.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "surname", label: "Surname", type: "string", required: true },
    {
      key: "site",
      label: "Site",
      type: "string",
      required: true,
      hint: "Name of an existing site (the 'site' company list).",
    },
    { key: "startDate", label: "Start date", type: "date", required: true, hint: "YYYY-MM-DD" },
    { key: "department", label: "Department", type: "string" },
    { key: "title", label: "Job title", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "New employee id" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const work: Record<string, unknown> = {
      site: requireString(input.site, "site"),
      startDate: requireDate(input.startDate, "startDate"),
    };
    if (input.department) work.department = input.department;
    if (input.title) work.title = input.title;
    return await new HibobClient(ctx).post("/people", {
      email: requireString(input.email, "email"),
      firstName: requireString(input.firstName, "firstName"),
      surname: requireString(input.surname, "surname"),
      work,
    });
  },
};

export default personCreate;
