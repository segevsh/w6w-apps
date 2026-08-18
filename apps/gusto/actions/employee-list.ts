import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/employees` — the roster.
 *
 * **Terminated employees are excluded unless asked for.** That default is right
 * for "who works here" and wrong for almost every reconciliation: a workflow
 * syncing Gusto into another system will quietly never learn that somebody
 * left, because the leaver simply stops appearing. `terminated` is therefore a
 * first-class parameter here rather than something buried.
 *
 * `include` pulls in the expensive nested data — `all_compensations`,
 * `custom_fields` — in the same request. Asking for compensation here is one
 * call; fetching each employee's jobs afterwards is one call per person, which
 * on a few hundred employees is the difference between a workflow that finishes
 * and one that does not.
 */
const action: ActionDefinition = {
  key: "employee-list",
  type: "read",
  resource: "employee",
  title: "List employees",
  description:
    "A company's employees. Terminated people are EXCLUDED by default, which is why a sync " +
    "that only reads this never learns that somebody left.",
  params: [
    COMPANY_PARAM,
    {
      key: "terminated",
      label: "Terminated",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Active only (Gusto's default)" },
        { value: "true", label: "Terminated only" },
        { value: "false", label: "Explicitly active only" },
      ],
      hint: "A leaver disappears from the default list rather than being marked — read this " +
        "with `true` to find them.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      default: "",
      placeholder: "all_compensations,custom_fields",
      hint: "Comma-separated nested data to fetch in the same request — far cheaper than a " +
        "call per employee.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "uuid", type: "string", label: "Employee UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "terminated", type: "boolean", label: "Terminated" },
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const terminated = String(p.terminated ?? "");

    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/employees`,
      {
        query: {
          terminated: terminated || undefined,
          include: String(p.include ?? "") || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
