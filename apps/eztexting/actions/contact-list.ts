import type { ActionDefinition } from "@w6w/types";
import { compact, EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/contacts` — list contacts; text filters are `like` matches, `source`/`optOut` exact. */
interface Input {
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  groupName?: string;
  source?: string;
  optOut?: boolean;
  page?: number;
  size?: string;
  sort?: string;
}

const SOURCES = ["Unknown", "WebInterface", "Upload", "WebWidget", "API", "Keyword"];

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, filtered by phone number, name, email, group, source or opt-out.",
  params: [
    { key: "phoneNumber", label: "Phone number contains", type: "string" },
    { key: "firstName", label: "First name contains", type: "string" },
    { key: "lastName", label: "Last name contains", type: "string" },
    { key: "email", label: "Email contains", type: "string" },
    { key: "groupName", label: "Group name contains", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: SOURCES.map((v) => ({ value: v, label: v })),
    },
    { key: "optOut", label: "Opted out", type: "boolean", hint: "Leave unset for both." },
    ...paginationParams(),
    sortParam(),
  ],
  output: pageOutput("Contacts"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/contacts", {
      query: compact({
        page: input.page,
        size: input.size,
        sort: input.sort,
        "filters[phoneNumber][like]": input.phoneNumber,
        "filters[firstName][like]": input.firstName,
        "filters[lastName][like]": input.lastName,
        "filters[email][like]": input.email,
        "filters[groupName][like]": input.groupName,
        "filters[source][eq]": input.source,
        "filters[optOut][eq]": input.optOut,
      }) as Record<string, string>,
    });
  },
};

export default contactList;
