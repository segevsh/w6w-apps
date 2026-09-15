import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";
import { parseList } from "../lib/params.ts";

interface Input {
  name: string;
  companyId?: number;
  identifier?: string;
  currency?: string;
  leaderId?: number;
  dealId?: number;
  fixedPrice?: boolean;
  startDate?: string;
  finishDate?: string;
  budget?: number;
  info?: string;
  tags?: string[] | string;
}

/**
 * `POST /projects` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Only `name` is
 * required here; the OpenAPI schema marks no field required, but a project needs at least a name
 * to be meaningful. `currency` is documented as immutable once set, so get it right at creation.
 * Retainer billing (`retainer: true`, requiring `start_date`/`finish_date`/`budget_monthly`) is
 * out of scope for this action — use MOCO's UI for retainer projects.
 */
const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new (non-retainer) project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "companyId", label: "Customer company ID", type: "number" },
    {
      key: "identifier",
      label: "Identifier",
      type: "string",
      advanced: true,
      hint: "Project number, if number ranges are manual.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "e.g. CHF. Cannot be changed after creation.",
    },
    { key: "leaderId", label: "Leader (user) ID", type: "number", advanced: true },
    { key: "dealId", label: "Linked deal ID", type: "number", advanced: true },
    { key: "fixedPrice", label: "Fixed price", type: "boolean", advanced: true },
    { key: "startDate", label: "Start date", type: "date", advanced: true },
    { key: "finishDate", label: "Finish date", type: "date", advanced: true },
    { key: "budget", label: "Budget", type: "number", advanced: true },
    { key: "info", label: "Notes", type: "text", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request("/projects", {
      method: "POST",
      body: compact({
        name: input.name,
        company_id: input.companyId,
        identifier: input.identifier,
        currency: input.currency,
        leader_id: input.leaderId,
        deal_id: input.dealId,
        fixed_price: input.fixedPrice,
        start_date: input.startDate,
        finish_date: input.finishDate,
        budget: input.budget,
        info: input.info,
        tags: parseList(input.tags),
      }),
    });
  },
};

export default projectCreate;
