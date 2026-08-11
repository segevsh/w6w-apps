import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, PARTNER_ONLY_NOTE } from "../lib/params.ts";

/**
 * `GET /routes` — a day's routes: employees grouped with their appointments,
 * events and estimates.
 *
 * This endpoint spells its page-size parameter **`per_page`**, not `page_size`.
 * It is the only list endpoint in the reference that does — every other one uses
 * `page_size`, and `/checklists` is the only other `per_page`. Sending
 * `page_size` here would be silently ignored and return ten routes, so the
 * parameter is built explicitly rather than through the shared pagination
 * fragment.
 *
 * `date` defaults to today when omitted.
 */
interface Input {
  date?: string;
  page?: number;
  perPage?: number;
  companyId?: string;
}

const routeList: ActionDefinition<Input, NormalizedList> = {
  key: "route-list",
  type: "read",
  resource: "schedule",
  title: "Get Routes",
  description:
    "List a day's routes — each groups an employee with their job appointments, events and " +
    "estimates. Defaults to today. " + PARTNER_ONLY_NOTE,
  params: [
    {
      key: "date",
      label: "Date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to today.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1 },
      hint: "This endpoint calls it `per_page`, not `page_size` like every other list. Vendor " +
        "default is 10.",
    },
    companyIdParam,
  ],
  output: listOutput("Routes"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/routes", "routes", {
      companyId: input.companyId,
      query: {
        date: input.date,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default routeList;
