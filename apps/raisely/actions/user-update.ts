import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient, seg } from "../lib/client.ts";
import { customFieldParams, overwriteParam, privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
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
  overwriteCustomFields?: boolean;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user's contact details, address or custom fields.",
  idempotent: true,
  params: [
    { key: "uuid", label: "User uuid", type: "string", required: true },
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
    ...customFieldParams(),
    overwriteParam(),
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
    return await new RaiselyClient(ctx).data(`/users/${seg(input.uuid)}`, {
      method: "PATCH",
      query: compact({ private: input.private }),
      body: compact({ data, overwriteCustomFields: input.overwriteCustomFields }),
    });
  },
};

export default userUpdate;
