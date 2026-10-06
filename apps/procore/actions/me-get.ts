import type { ActionDefinition } from "@w6w/types";
import { ProcoreClient } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId?: number;
}

/**
 * `GET /rest/v1.0/me` — one of only two endpoints that need no
 * `Procore-Company-Id` header. Pass `company_id` or `project_id` as a query
 * parameter only if you want the user's name resolved in that context.
 */
const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the Procore user the connection is signed in as (id, login email, name).",
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Optional. Sent as the `company_id` query parameter, not as a header.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Optional. Sent as the `project_id` query parameter.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "login", type: "string", label: "Login email" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new ProcoreClient(ctx);
    const reply = await client.request("/rest/v1.0/me", {
      noCompany: true,
      query: { company_id: input.companyId, project_id: input.projectId },
    });
    return reply.data;
  },
};

export default meGet;
