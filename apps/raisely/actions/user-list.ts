import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  email?: string;
  fullName?: string;
  country?: string;
  postcode?: string;
  phone_number?: string;
  organisation?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List users (supporters and donors), optionally filtered by email, name, country, postcode or phone.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "phone_number", label: "Phone number", type: "string" },
    { key: "organisation", label: "Organisation", type: "string", hint: "Organisation uuid." },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Users" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/users", {
      query: {
        ...listQuery(input),
        ...compact({
          email: input.email,
          fullName: input.fullName,
          country: input.country,
          postcode: input.postcode,
          phone_number: input.phone_number,
          organisation: input.organisation,
        }),
      },
    });
  },
};

export default userList;
