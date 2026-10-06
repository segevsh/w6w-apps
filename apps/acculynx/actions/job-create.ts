import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, compact, toIdList } from "../lib/client.ts";

interface Input {
  contactId: string;
  leadSourceId?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  priority?: string;
  jobCategoryId?: number;
  workTypeId?: number;
  tradeTypeIds?: unknown;
  notes?: string;
}

const action: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description:
    "Create a job for an existing contact. AccuLynx creates it in the Lead milestone, unassigned. The location address is optional but, if any part is given, street, city, state, country and ZIP are all required.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact id",
      type: "string",
      required: true,
      hint: "The primary contact; from Create Contact or List Contacts.",
    },
    {
      key: "leadSourceId",
      label: "Lead source id",
      type: "string",
      hint: "From List Lead Sources.",
    },
    { key: "street1", label: "Street", type: "string" },
    { key: "street2", label: "Street 2", type: "string", advanced: true },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string", hint: "State or province code, e.g. MI." },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 alpha-2 code, e.g. US." },
    { key: "zipCode", label: "ZIP / postal code", type: "string" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      advanced: true,
      options: [{ value: "Urgent", label: "Urgent" }, { value: "High", label: "High" }, {
        value: "Normal",
        label: "Normal",
      }],
    },
    { key: "jobCategoryId", label: "Job category id", type: "number", advanced: true },
    { key: "workTypeId", label: "Work type id", type: "number", advanced: true },
    {
      key: "tradeTypeIds",
      label: "Trade type ids",
      type: "json",
      advanced: true,
      hint:
        "Array of trade type ids configured in company settings; a comma-separated string also works.",
    },
    { key: "notes", label: "Notes", type: "text", advanced: true, hint: "Up to 1000 characters." },
  ],
  output: [{ key: "id", type: "string", label: "New job id" }, {
    key: "_link",
    type: "string",
    label: "Link to fetch the job",
  }],

  async execute(input, ctx) {
    const address = compact({
      street1: input.street1,
      street2: input.street2,
      city: input.city,
      state: input.state,
      country: input.country,
      zipCode: input.zipCode,
    });
    if (Object.keys(address).length > 0) {
      const missing = ["street1", "city", "state", "country", "zipCode"].filter((k) =>
        !(k in address)
      );
      if (missing.length > 0) {
        throw new Error(`a location address needs ${missing.join(", ")}`);
      }
    }
    const tradeTypeIds = toIdList(input.tradeTypeIds, "tradeTypeIds");
    const body = {
      contact: { id: input.contactId },
      ...(input.leadSourceId ? { leadSource: { id: input.leadSourceId } } : {}),
      ...(Object.keys(address).length > 0 ? { locationAddress: address } : {}),
      ...compact({ priority: input.priority, notes: input.notes }),
      ...(input.jobCategoryId !== undefined ? { jobCategory: { id: input.jobCategoryId } } : {}),
      ...(input.workTypeId !== undefined ? { workType: { id: input.workTypeId } } : {}),
      ...(tradeTypeIds.length > 0 ? { tradeTypes: tradeTypeIds.map((id) => ({ id })) } : {}),
    };
    return await new AccuLynxClient(ctx).send("/jobs", { method: "POST", body });
  },
};

export default action;
