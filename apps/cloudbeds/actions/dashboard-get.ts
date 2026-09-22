import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { propertyIdParam } from "../lib/params.ts";

/**
 * `GET /getDashboard` — "basic information about the current state of the
 * hotel".
 *
 * The two parameters are both optional and do different things: `propertyID`
 * picks which property to report on, `date` picks which day. Omitting `date`
 * asks for the current state, which is the common case, so it is left empty by
 * default rather than prefilled with today's date on the client side — the
 * hotel's own day is what matters, not the caller's.
 *
 * `date` is a `date` param because it is documented as a plain `YYYY-MM-DD`
 * day. The response `data` is typed only as `object`, so it is returned whole.
 */
interface Input {
  propertyID?: string;
  date?: string;
}

const dashboardGet: ActionDefinition<Input> = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get Dashboard",
  description: "Get basic information about the current state of a property.",
  params: [
    propertyIdParam,
    {
      key: "date",
      label: "Date",
      type: "date",
      hint: "Return the dashboard for this day (`YYYY-MM-DD`). Leave empty for the current state.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Dashboard" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<Record<string, unknown>>>(
      "/getDashboard",
      { query: { propertyID: input.propertyID, date: input.date } },
    );
  },
};

export default dashboardGet;
