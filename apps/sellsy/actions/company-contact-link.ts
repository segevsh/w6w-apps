import { coerce, define } from "../lib/actions.ts";
import { call, seg } from "../lib/client.ts";

/** `POST /companies/{companyId}/contacts/{contactId}` (scopes `companies.write` + `contacts.read`). */
export default define(
  {
    key: "company-contact-link",
    type: "perform",
    title: "Link Contact To Company",
    description:
      "Attach an existing contact to a company, optionally as its main, invoicing or dunning contact. Needs the `companies.write` and `contacts.read` scopes.",
  },
  [
    { key: "company_id", label: "Company ID", as: "int", required: true },
    { key: "contact_id", label: "Contact ID", as: "int", required: true },
    {
      key: "roles",
      label: "Roles",
      as: "strList",
      hint: "Comma-separated, any of: main, invoicing, dunning. Leave empty for a plain link.",
    },
  ],
  [
    { key: "linked", type: "boolean", label: "True once Sellsy accepted the link" },
    { key: "result", type: "json", label: "Sellsy's response body, if any" },
  ],
  async (input, ctx) => {
    const roles = coerce("roles", input.roles, "strList") as string[] | undefined;
    const result = await call(
      ctx,
      `/companies/${seg(input.company_id)}/contacts/${seg(input.contact_id)}`,
      { method: "POST", body: roles?.length ? { roles } : {} },
    );
    return { linked: true, result };
  },
  true,
);
