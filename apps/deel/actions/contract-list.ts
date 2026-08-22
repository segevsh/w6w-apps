import type { ActionDefinition } from "@w6w/types";
import { csv, DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /contracts` — verified against Deel's own OpenAPI document
 * (`ic-endpoints.json`, `get-contracts`).
 *
 * **Cursor**-paginated: the response's `page.cursor` goes back as
 * `after_cursor`. The HRIS collections page by `offset` instead, and the two
 * are not interchangeable — `lib/client.ts` keeps them apart.
 */
const action: ActionDefinition = {
  key: "contract-list",
  type: "read",
  resource: "contract",
  title: "List contracts",
  description: "List contracts, filtered by type, status, team or country.",
  params: [
    ...LIST_PARAMS,
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: [
        { value: "new", label: "New" },
        { value: "in_progress", label: "In progress" },
        { value: "waiting_for_client_sign", label: "Waiting for client signature" },
        { value: "waiting_for_employee_sign", label: "Waiting for worker signature" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "types",
      label: "Types",
      type: "string",
      default: "",
      placeholder: "ongoing_time_based,pay_as_you_go_time_based",
      hint: "Comma-separated Deel contract types.",
    },
    { key: "teamId", label: "Team ID", type: "string", default: "" },
    { key: "legalEntityId", label: "Legal Entity ID", type: "string", default: "" },
    {
      key: "countries",
      label: "Countries",
      type: "string",
      default: "",
      hint: "Comma-separated ISO country codes.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "Your own identifier, if you set one when creating the contract.",
    },
    {
      key: "orderDirection",
      label: "Order",
      type: "select",
      default: "",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      statuses: csv(p.statuses),
      types: csv(p.types),
      team_id: (p.teamId as string) || undefined,
      legal_entity_id: (p.legalEntityId as string) || undefined,
      countries: csv(p.countries),
      external_id: (p.externalId as string) || undefined,
      order_direction: (p.orderDirection as string) || undefined,
    };

    ctx.log("info", "listing Deel contracts", { returnAll, limit });

    return await new DeelClient(ctx).requestAllCursor(
      "/contracts",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
