import type { ActionDefinition } from "@w6w/types";
import { compact, FullEnrichClient, jsonValue, strList } from "../lib/client.ts";
import { SILENT_FAIL_PARAM, WEBHOOK_PARAMS, webhookBody } from "../lib/bulk.ts";

interface Input {
  name: string;
  firstName?: string;
  lastName?: string;
  domain?: string;
  companyName?: string;
  linkedinUrl?: string;
  enrichFields?: string[] | string;
  custom?: Record<string, string> | string;
  contacts?: unknown;
  webhookUrl?: string;
  contactFinishedWebhookUrl?: string;
  silentFail?: boolean;
}

const FIELDS = ["contact.work_emails", "contact.personal_emails", "contact.phones"];
const DEFAULT_FIELDS = ["contact.work_emails"];

/**
 * `POST /contact/enrich/bulk` — starts an ASYNCHRONOUS enrichment (up to 100
 * contacts) and answers `{ enrichment_id }`. Results arrive on the webhook URL
 * or via `enrich-get`.
 */
const enrichStart: ActionDefinition<Input> = {
  key: "enrich-start",
  type: "perform",
  resource: "enrichment",
  title: "Start Contact Enrichment",
  description:
    "Start a waterfall enrichment for one contact (the fields below) or up to 100 (Contacts JSON). Asynchronous: returns an enrichment ID immediately; read the result with Get Enrichment Result or receive it on a webhook. Credits are charged only for data actually found.",
  idempotent: false,
  params: [
    { key: "name", label: "Enrichment name", type: "string", required: true },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      hint: "Single-contact mode. Ignored when Contacts is set.",
    },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "domain",
      label: "Company domain",
      type: "string",
      hint:
        "e.g. example.com. A first name, last name and a domain or company name, or a LinkedIn URL, identify a person.",
    },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "linkedinUrl",
      label: "LinkedIn URL",
      type: "string",
      hint:
        "A standard profile URL or a Sales Navigator URL. Also returns the full profile in the result.",
    },
    {
      key: "enrichFields",
      label: "Fields to enrich",
      type: "multiselect",
      options: FIELDS.map((value) => ({ value, label: value })),
      hint:
        "Required by the API. Defaults to work emails only because phones cost 10 credits and personal emails 3.",
    },
    {
      key: "custom",
      label: "Custom data (JSON)",
      type: "json",
      hint:
        "String-valued object returned untouched in the result, to correlate a contact with your own record. The reference says both 20 entries and 10 keys / 100 characters per value; stay within the stricter limit.",
    },
    {
      key: "contacts",
      label: "Contacts (JSON array)",
      type: "json",
      hint:
        "Bulk mode, up to 100 objects: {first_name, last_name, domain, company_name, linkedin_url, enrich_fields, custom}. Objects without enrich_fields get the Fields to enrich above.",
    },
    ...WEBHOOK_PARAMS,
    SILENT_FAIL_PARAM,
  ],
  output: [{ key: "enrichmentId", type: "string", label: "Enrichment ID" }],

  async execute(input, ctx) {
    const fields = strList(input.enrichFields) ?? DEFAULT_FIELDS;
    const bulk = jsonValue(input.contacts);
    let data: Record<string, unknown>[];
    if (Array.isArray(bulk) && bulk.length > 0) {
      data = bulk.map((c) => {
        const contact = { ...(c as Record<string, unknown>) };
        if (!contact.enrich_fields) contact.enrich_fields = fields;
        return contact;
      });
    } else {
      data = [compact({
        first_name: input.firstName,
        last_name: input.lastName,
        domain: input.domain,
        company_name: input.companyName,
        linkedin_url: input.linkedinUrl,
        enrich_fields: fields,
        custom: jsonValue(input.custom),
      })];
    }

    const res = await new FullEnrichClient(ctx).request<{ enrichment_id?: string }>(
      "POST",
      "/contact/enrich/bulk",
      {
        query: { silentFail: input.silentFail ? true : undefined },
        body: compact({ name: input.name, ...webhookBody(input), data }),
      },
    );
    return { enrichmentId: res.enrichment_id ?? null };
  },
};

export default enrichStart;
