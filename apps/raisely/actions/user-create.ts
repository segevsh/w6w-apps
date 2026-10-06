import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient } from "../lib/client.ts";
import { customFieldParams, privateParam } from "../lib/params.ts";

interface Input {
  private?: boolean;
  merge?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  preferredName?: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  language?: string;
  photoUrl?: string;
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description:
    "Create a user (supporter or donor). With Merge on, an existing user with the same email is " +
    "updated instead of a new one being created.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Raisely uses the email as the unique identifier and deduplicates on it.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "suburb", label: "Suburb / city", type: "string" },
    { key: "state", label: "State / province", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "language", label: "Language", type: "string" },
    { key: "photoUrl", label: "Photo URL", type: "string" },
    {
      key: "merge",
      label: "Merge into existing user",
      type: "boolean",
      hint: "When true, update the existing user with this email instead of creating a new user.",
    },
    ...customFieldParams(),
    privateParam(),
  ],
  output: [
    { key: "uuid", type: "string", label: "User uuid" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const data = compact({
      ...pick(input, [
        "email",
        "firstName",
        "lastName",
        "fullName",
        "preferredName",
        "phoneNumber",
        "address1",
        "address2",
        "suburb",
        "state",
        "postcode",
        "country",
        "language",
        "photoUrl",
      ]),
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data("/users", {
      method: "POST",
      query: compact({ private: input.private }),
      body: compact({ data, merge: input.merge }),
    });
  },
};

export default userCreate;
