import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, ENRICH_PATH } from "../lib/client.ts";
import { batchOptions } from "../lib/contact.ts";
import { callbackParam, languageParam, sirenParam } from "../lib/params.ts";

interface Input {
  contacts: unknown;
  siren?: boolean;
  language?: string;
  customCallbackUrl?: string;
}

export const MAX_BATCH = 250;

/** The `contacts` param arrives as an array, or as a JSON string from a template field. */
export function parseContacts(raw: unknown): Record<string, unknown>[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("contacts must be a JSON array of contact objects");
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("contacts must be a non-empty array of contact objects");
  }
  if (value.length > MAX_BATCH) {
    throw new Error(
      `Dropcontact accepts at most ${MAX_BATCH} contacts per request (got ${value.length})`,
    );
  }
  if (!value.every((c) => c && typeof c === "object" && !Array.isArray(c))) {
    throw new Error("every entry in contacts must be an object");
  }
  return value as Record<string, unknown>[];
}

/**
 * `POST /v1/enrich/all` — start an asynchronous batch. Documented as up to 250 contacts per
 * request, each under 15 kB. The answer is a `request_id`; the data comes from Get Enrichment
 * Result (or the webhook). Credits are charged on success, when the result is produced.
 */
const submitEnrichmentBatch: ActionDefinition<Input> = {
  key: "submit-enrichment-batch",
  type: "perform",
  resource: "enrichment",
  title: "Submit Enrichment Batch",
  description: "Start an asynchronous enrichment of up to 250 contacts. Returns a request ID; " +
    "fetch the result with Get Enrichment Result, or set a webhook URL. Dropcontact charges " +
    "credits only for verified emails it returns, when the result is produced.",
  idempotent: false,
  params: [
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint: 'Array of up to 250 objects, e.g. [{"first_name":"John","last_name":"Smith",' +
        '"website":"corporation.com"},{"email":"name@company.com"}]. Fields: email, first_name, ' +
        "last_name, full_name, phone, company, website, linkedin, company_linkedin, num_siren, " +
        "siret, country, job, custom_fields. Each needs an email, a LinkedIn URL, or a name plus company.",
    },
    sirenParam,
    languageParam,
    callbackParam,
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID to poll with" },
    { key: "creditsLeft", type: "number", label: "Credits left" },
    { key: "submitted", type: "number", label: "Contacts submitted" },
    {
      key: "entries",
      type: "array",
      label: "Per-entry errors and warnings the API returned at submit time, when any",
    },
  ],

  async execute(input, ctx) {
    const contacts = parseContacts(input.contacts);
    const { body } = await new DropcontactClient(ctx).request("POST", ENRICH_PATH, {
      body: { data: contacts, ...batchOptions(input) },
    });
    return {
      requestId: body.request_id,
      creditsLeft: body.credits_left,
      submitted: contacts.length,
      entries: Array.isArray(body.data) ? body.data : [],
    };
  },
};

export default submitEnrichmentBatch;
