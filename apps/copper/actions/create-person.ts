import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, CUSTOM_FIELDS_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  emails?: unknown[] | null;
  phoneNumbers?: unknown[] | null;
  address?: Record<string, unknown> | null;
  socials?: unknown[] | null;
  websites?: unknown[] | null;
  title?: string;
  details?: string;
  companyId?: number;
  contactTypeId?: number;
  assigneeId?: number;
  tags?: string[] | null;
  customFields?: unknown[] | null;
}

/**
 * `POST /people` — create a Person.
 *
 * `name` is the only field Copper marks required. Everything else is optional,
 * and the collection-shaped fields are arrays of typed objects
 * (`{email, category}`, `{number, category}`, `{url, category}`) so one Person
 * can carry a work and a home address without either being privileged.
 *
 * **Not idempotent, and it will fail rather than duplicate.** Email is a unique
 * key for People: "If you try to create a new Person with an existing email
 * address, then your request will fail." So a retry after a successful create
 * errors instead of making a second record — safer than a duplicate, but still
 * not a no-op, which is why `idempotent` is `false`. Use Find Person by Email
 * first if you need upsert semantics.
 */
const createPerson: ActionDefinition<Input> = {
  key: "create-person",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description:
    "Create a Person. Email addresses are unique across People — creating one that already exists " +
    "fails rather than duplicating.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Full name. Copper splits it into first/middle/last itself.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'JSON array, e.g. `[{"email": "jim@example.com", "category": "work"}]`.',
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'JSON array, e.g. `[{"number": "415-123-4567", "category": "mobile"}]`.',
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint: "JSON object with `street`, `city`, `state`, `postal_code`, `country`, e.g. " +
        '`{"street": "123 Main Street", "city": "Savannah", "country": "United States"}`.',
    },
    {
      key: "socials",
      label: "Socials",
      type: "json",
      hint: 'JSON array, e.g. `[{"url": "https://x.com/jim", "category": "twitter"}]`.',
    },
    {
      key: "websites",
      label: "Websites",
      type: "json",
      hint: 'JSON array, e.g. `[{"url": "https://example.com", "category": "work"}]`.',
    },
    { key: "title", label: "Job title", type: "string" },
    { key: "details", label: "Details", type: "text", hint: "Free-text description." },
    {
      key: "companyId",
      label: "Company ID",
      type: "number",
      hint: "Primary Company. Changing it later needs the Related Items API, not an update.",
    },
    {
      key: "contactTypeId",
      label: "Contact type ID",
      type: "number",
      hint: "Read the ids from `GET /contact_types`.",
    },
    { key: "assigneeId", label: "Assignee (User) ID", type: "number" },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array of strings." },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/people", {
      method: "POST",
      body: compact({
        name: input.name,
        emails: input.emails ?? undefined,
        phone_numbers: input.phoneNumbers ?? undefined,
        address: input.address ?? undefined,
        socials: input.socials ?? undefined,
        websites: input.websites ?? undefined,
        title: input.title,
        details: input.details,
        company_id: input.companyId,
        contact_type_id: input.contactTypeId,
        assignee_id: input.assigneeId,
        tags: input.tags ?? undefined,
        custom_fields: input.customFields ?? undefined,
      }),
    });
  },
};

export default createPerson;
