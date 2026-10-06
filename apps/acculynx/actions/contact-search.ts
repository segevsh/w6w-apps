import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, compact, toIdList } from "../lib/client.ts";
import { PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  startDate: string;
  endDate: string;
  searchTerm?: string;
  contactTypes?: unknown;
  sortColumn?: string;
  sortDirection?: string;
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by term and contact type within a created-date window.",
  params: [
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 date-time.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 date-time.",
    },
    { key: "searchTerm", label: "Search term", type: "string" },
    {
      key: "contactTypes",
      label: "Contact types",
      type: "json",
      advanced: true,
      hint:
        "Array of contact type strings to filter by (see List Contact Types); a comma-separated string also works.",
    },
    {
      key: "sortColumn",
      label: "Sort column",
      type: "select",
      default: "CreatedDate",
      advanced: true,
      options: [
        { value: "CreatedDate", label: "CreatedDate" },
        { value: "CompanyName", label: "CompanyName" },
        { value: "ContactType", label: "ContactType" },
        { value: "firstName", label: "firstName" },
        { value: "lastName", label: "lastName" },
        { value: "LifeTimeValue", label: "LifeTimeValue" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      default: "Descending",
      advanced: true,
      options: [{ value: "Ascending", label: "Ascending" }, {
        value: "Descending",
        label: "Descending",
      }],
    },
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    const contactTypes = toIdList(input.contactTypes, "contactTypes");
    const body = {
      ...(contactTypes.length > 0 ? { contactTypes } : {}),
      ...compact({ searchTerm: input.searchTerm }),
      startDate: input.startDate,
      endDate: input.endDate,
      sort: {
        sortDirection: input.sortDirection ?? "Descending",
        sortColumn: input.sortColumn ?? "CreatedDate",
      },
    };
    return await new AccuLynxClient(ctx).send("/contacts/search", {
      method: "POST",
      query: pageQuery(input, "pageStartIndex"),
      body,
    });
  },
};

export default action;
