import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, detailedParam, itemParam, pk, seg, ymd } from "../lib/params.ts";

interface Input {
  shortname: string;
  itemPk: number | string;
  startDate: string;
  endDate: string;
  bookableOnly?: boolean;
  detailed?: boolean;
  customFieldsSummary?: boolean;
}

const availabilityListByDateRange: ActionDefinition<Input> = {
  key: "availability-list-by-date-range",
  type: "search",
  resource: "availability",
  title: "List Availabilities by Date Range",
  description:
    "List the minimal availabilities of one item between two dates, inclusive (company-local). FareHarbor times out at 60 seconds (HTTP 504) on wide ranges; pull in 7-day segments.",
  params: [
    companyParam,
    itemParam,
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD, inclusive, in the company's local time.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      required: true,
      hint:
        "YYYY-MM-DD, inclusive. Keep the range short (FareHarbor suggests 7-day segments): wide ranges time out with a 504.",
    },
    {
      key: "bookableOnly",
      label: "Bookable only",
      type: "boolean",
      hint: "Include only availabilities that are bookable.",
    },
    detailedParam,
    {
      key: "customFieldsSummary",
      label: "Custom fields summary",
      type: "boolean",
      hint: "Include summarized custom-field metadata.",
    },
  ],
  output: [
    { key: "availabilities", type: "array", label: "Availabilities" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/items/${
        pk(input.itemPk, "itemPk")
      }/minimal/availabilities/date-range/${ymd(input.startDate, "startDate")}/${
        ymd(input.endDate, "endDate")
      }/`,
      {
        query: {
          bookable_only: input.bookableOnly,
          detailed: input.detailed,
          custom_fields_summary: input.customFieldsSummary,
        },
      },
    );
  },
};

export default availabilityListByDateRange;
