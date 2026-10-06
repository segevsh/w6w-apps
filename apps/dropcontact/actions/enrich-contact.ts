import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, ENRICH_PATH, isNotReady, sleep } from "../lib/client.ts";
import { batchOptions, buildContact, primaryEmail } from "../lib/contact.ts";
import { callbackParam, languageParam, sirenParam } from "../lib/params.ts";

type Input = Record<string, unknown>;

export const MAX_WAIT_SECONDS = 150;

const text = (key: string, label: string, hint?: string) => ({
  key,
  label,
  type: "string" as const,
  hint,
});

/**
 * One contact through the batch endpoint (`data` has a single entry), optionally polling for
 * the answer. With `waitSeconds: 0` (the default) it only submits and returns the request ID.
 */
const enrichContact: ActionDefinition<Input> = {
  key: "enrich-contact",
  type: "perform",
  resource: "contact",
  title: "Enrich Contact",
  description: "Find and verify the business email and company data of one contact. Needs an " +
    "email, a LinkedIn URL, or a name plus company. Asynchronous at the vendor: set Wait seconds " +
    "to poll for the answer inside this step, otherwise you get a request ID for Get Enrichment " +
    "Result. Credits are charged only when a verified email is returned.",
  idempotent: false,
  params: [
    text("email", "Email", "An address to verify, or a hint to find the right one."),
    text("firstName", "First name"),
    text("lastName", "Last name"),
    text("fullName", "Full name", "Use instead of first and last name."),
    text("company", "Company name"),
    text("website", "Company website", "e.g. corporation.com"),
    text("linkedin", "Contact LinkedIn URL"),
    text("companyLinkedin", "Company LinkedIn URL"),
    text("phone", "Phone"),
    text("job", "Job title"),
    text("country", "Country code", "e.g. US, FR."),
    text("numSiren", "Company SIREN"),
    text("siret", "Company SIRET"),
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: "Object of strings carried through unchanged into the result.",
    },
    sirenParam,
    languageParam,
    callbackParam,
    {
      key: "waitSeconds",
      label: "Wait seconds",
      type: "number",
      default: 0,
      validation: { min: 0, max: MAX_WAIT_SECONDS },
      hint: "How long to poll for the result inside this step (0 = submit only). Dropcontact " +
        "asks for about 30 seconds between polls; a batch usually needs a minute or more.",
    },
    {
      key: "pollIntervalSeconds",
      label: "Poll interval seconds",
      type: "number",
      default: 30,
      validation: { min: 1, max: 60 },
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "creditsLeft", type: "number", label: "Credits left" },
    { key: "ready", type: "boolean", label: "True when the enriched contact is present" },
    { key: "contact", type: "object", label: "The enriched contact (when ready)" },
    { key: "email", type: "string", label: "Best email (nominative first)" },
    { key: "emailQualification", type: "string", label: "Qualification of that email" },
    { key: "emails", type: "array", label: "All emails with their qualification" },
    { key: "errors", type: "object", label: "Vendor errors for this entry, when any" },
    { key: "warnings", type: "object", label: "Vendor warnings for this entry, when any" },
  ],

  async execute(input, ctx) {
    const contact = buildContact(input);
    if (Object.keys(contact).length === 0) {
      throw new Error("provide at least one contact field (email, LinkedIn, or name and company)");
    }
    const client = new DropcontactClient(ctx);
    const submitted = await client.request("POST", ENRICH_PATH, {
      body: { data: [contact], ...batchOptions(input) },
    });
    const requestId = submitted.body.request_id;
    const out: Record<string, unknown> = {
      requestId,
      creditsLeft: submitted.body.credits_left,
      ready: false,
    };

    const waitMs = Math.min(Math.max(Number(input.waitSeconds ?? 0) || 0, 0), MAX_WAIT_SECONDS) *
      1000;
    const intervalMs = Math.max(Number(input.pollIntervalSeconds ?? 30) || 30, 0.01) * 1000;
    if (!requestId || waitMs === 0) return out;

    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      await sleep(Math.min(intervalMs, Math.max(deadline - Date.now(), 0)));
      const { body } = await client.request(
        "GET",
        `${ENRICH_PATH}/${encodeURIComponent(requestId)}`,
      );
      if (isNotReady(body) || !Array.isArray(body.data)) continue;
      const first = (body.data[0] ?? {}) as Record<string, unknown>;
      const best = primaryEmail(first.email);
      return {
        ...out,
        creditsLeft: body.credits_left ?? out.creditsLeft,
        ready: true,
        contact: first,
        email: best?.email,
        emailQualification: best?.qualification,
        emails: Array.isArray(first.email) ? first.email : [],
        errors: first.errors,
        warnings: first.warnings,
      };
    }
    return out;
  },
};

export default enrichContact;
