import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_uuid}/departments` — the org structure Gusto
 * knows about.
 *
 * Each department carries its `employees` and `contractors` as lists of uuids,
 * which makes this the cheapest way to answer "who reports into support" — one
 * call instead of reading every person and grouping them.
 *
 * Departments in Gusto are flat: there is no nesting, and no manager field.
 * Anything hierarchical lives in an HRIS, not here.
 */
const action: ActionDefinition = {
  key: "department-list",
  type: "read",
  resource: "department",
  title: "List departments",
  description:
    "Departments with their members — flat, with no nesting and no manager field, which is the " +
    "whole of Gusto's org model.",
  params: [COMPANY_PARAM, ...LIST_PARAMS],
  output: [
    { key: "uuid", type: "string", label: "Department UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "employees", type: "array", label: "Employees" },
    { key: "contractors", type: "array", label: "Contractors" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/departments`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
