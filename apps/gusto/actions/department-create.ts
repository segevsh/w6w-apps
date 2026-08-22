import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/companies/{company_uuid}/departments` — create a department.
 *
 * A department is just a title and a membership list; there is no hierarchy to
 * express and no manager to name. Creating one twice creates two departments
 * with the same title — Gusto does not treat the title as unique — which is why
 * this is not idempotent and why a workflow that provisions departments should
 * read the list first.
 */
const action: ActionDefinition = {
  key: "department-create",
  type: "perform",
  resource: "department",
  title: "Create department",
  description:
    "Create a department. Titles are not unique in Gusto, so running this twice makes two " +
    "departments with the same name.",
  idempotent: false,
  params: [
    COMPANY_PARAM,
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      default: "",
      placeholder: "Customer Support",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Department UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const title = String(p.title ?? "").trim();
    if (!title) throw new Error("`title` is required");

    return await new GustoClient(ctx).request(
      `/v1/companies/${encodeURIComponent(companyId)}/departments`,
      { method: "POST", body: { title } },
    );
  },
};

export default action;
