import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, detailedParam, itemParam, pk, seg, ymd } from "../lib/params.ts";

interface Input {
  shortname: string;
  itemPk: number | string;
  date: string;
  bookableOnly?: boolean;
  detailed?: boolean;
  customFieldsSummary?: boolean;
}

const availabilityListByDate: ActionDefinition<Input> = {
  key: "availability-list-by-date",
  type: "search",
  resource: "availability",
  title: "List Availabilities by Date",
  description:
    "List the minimal availabilities of one item on one date (company-local). Possibly-bookable only: 'call to book' slots are excluded. Custom-field detail is excluded.",
  params: [
    companyParam,
    itemParam,
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD, in the company's local time.",
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
      }/minimal/availabilities/date/${ymd(input.date, "date")}/`,
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

export default availabilityListByDate;
