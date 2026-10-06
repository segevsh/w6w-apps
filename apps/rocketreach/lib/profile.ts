import type { OutputField, Param } from "@w6w/types";

import { compact } from "./client.ts";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? v as Obj : {});

/**
 * Person lookup inputs. A profile is identified by ONE of: `id`, `linkedin_url`,
 * `email`, `phone`, `npi_number`, or `name` together with `current_employer`
 * (`title` narrows a name match). Verified against the Person Lookup reference.
 */
export const LOOKUP_IDENTITY: Param[] = [
  { key: "id", label: "RocketReach profile ID", type: "number", hint: "e.g. 123456." },
  {
    key: "linkedin_url",
    label: "LinkedIn URL",
    type: "string",
    hint: "e.g. www.linkedin.com/in/jamesgullbrand",
  },
  { key: "email", label: "Email", type: "string", hint: "An email address of the person." },
  {
    key: "name",
    label: "Name",
    type: "string",
    hint: "Must be given together with Current employer.",
  },
  {
    key: "current_employer",
    label: "Current employer",
    type: "string",
    hint: "Must be given together with Name.",
  },
  { key: "title", label: "Job title", type: "string", hint: "Narrows a name match." },
  { key: "phone", label: "Phone", type: "string", hint: "E.164 or international format." },
  {
    key: "npi_number",
    label: "NPI number",
    type: "number",
    hint: "US healthcare professional NPI.",
  },
];

export const LOOKUP_ASYNC: Param[] = [
  {
    key: "return_cached_emails",
    label: "Return cached emails",
    type: "boolean",
    default: true,
    hint: "Include already-known emails in the first response while the lookup is still running.",
  },
  {
    key: "webhook_id",
    label: "Webhook ID",
    type: "number",
    hint: "Send the finished result to this webhook (Account > API Usage & Settings). " +
      "Omitted, it defaults to your top-most enabled webhook.",
  },
];

/** Query parameters for a person lookup; throws when no identifying combination is given. */
export function lookupQuery(input: Obj): Obj {
  const q: Obj = compact({
    id: input.id,
    linkedin_url: input.linkedin_url,
    email: input.email,
    name: input.name,
    current_employer: input.current_employer,
    title: input.title,
    phone: input.phone,
    npi_number: input.npi_number,
    webhook_id: input.webhook_id,
  });
  const identified = q.id !== undefined || q.linkedin_url !== undefined ||
    q.email !== undefined || q.phone !== undefined || q.npi_number !== undefined ||
    (q.name !== undefined && q.current_employer !== undefined);
  if (!identified) {
    throw new Error(
      "Identify the person with an ID, LinkedIn URL, email, phone, NPI number, " +
        "or a name together with a current employer",
    );
  }
  if (typeof input.return_cached_emails === "boolean") {
    q.return_cached_emails = input.return_cached_emails;
  }
  return q;
}

export const PROFILE_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "RocketReach profile ID" },
  { key: "status", type: "string", label: "complete, progress, searching, waiting, failed" },
  { key: "complete", type: "boolean", label: "True when the lookup has finished" },
  { key: "name", type: "string", label: "Name" },
  { key: "currentTitle", type: "string", label: "Current job title" },
  { key: "currentEmployer", type: "string", label: "Current employer" },
  { key: "currentEmployerDomain", type: "string", label: "Employer domain" },
  { key: "linkedinUrl", type: "string", label: "LinkedIn URL" },
  { key: "location", type: "string", label: "Location" },
  { key: "recommendedEmail", type: "string", label: "Best email, when revealed" },
  { key: "recommendedProfessionalEmail", type: "string", label: "Best work email" },
  { key: "recommendedPersonalEmail", type: "string", label: "Best personal email" },
  { key: "emails", type: "array", label: "Emails: email, type, grade, smtp_valid" },
  { key: "phones", type: "array", label: "Phones: number, e164, type, grade, recommended" },
  { key: "jobHistory", type: "array", label: "Job history" },
  { key: "education", type: "array", label: "Education" },
  { key: "skills", type: "array", label: "Skills" },
  { key: "links", type: "object", label: "Social links" },
  { key: "profile", type: "object", label: "The full vendor profile, unchanged" },
];

/** Maps a vendor profile to camelCase output and adds `complete`. Tolerates a bare body. */
export function profileOutput(raw: unknown): Obj {
  const p = obj(raw);
  const status = typeof p.status === "string" ? p.status : undefined;
  return {
    id: p.id,
    status,
    complete: status === "complete",
    name: p.name ?? null,
    currentTitle: p.current_title ?? null,
    currentEmployer: p.current_employer ?? null,
    currentEmployerDomain: p.current_employer_domain ?? null,
    currentEmployerId: p.current_employer_id,
    linkedinUrl: p.linkedin_url ?? null,
    location: p.location ?? null,
    city: p.city ?? null,
    region: p.region ?? null,
    country: p.country_code ?? p.country ?? null,
    recommendedEmail: p.recommended_email ?? null,
    recommendedProfessionalEmail: p.recommended_professional_email ?? null,
    recommendedPersonalEmail: p.recommended_personal_email ?? null,
    emails: Array.isArray(p.emails) ? p.emails : [],
    phones: Array.isArray(p.phones) ? p.phones : [],
    jobHistory: Array.isArray(p.job_history) ? p.job_history : [],
    education: Array.isArray(p.education) ? p.education : [],
    skills: Array.isArray(p.skills) ? p.skills : [],
    links: p.links ?? null,
    profile: p,
  };
}

export const COMPANY_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "RocketReach company ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "domain", type: "string", label: "Domain" },
  { key: "emailDomain", type: "string", label: "Email domain" },
  { key: "tickerSymbol", type: "string", label: "Ticker" },
  { key: "yearFounded", type: "number", label: "Year founded" },
  { key: "numEmployees", type: "number", label: "Employees" },
  { key: "revenue", type: "number", label: "Revenue" },
  { key: "industry", type: "string", label: "Industry" },
  { key: "description", type: "string", label: "Description" },
  { key: "address", type: "object", label: "Address" },
  { key: "techstack", type: "array", label: "Technologies used" },
  { key: "company", type: "object", label: "The full vendor company, unchanged" },
];

export function companyOutput(raw: unknown): Obj {
  const c = obj(raw);
  return {
    id: c.id,
    name: c.name ?? null,
    domain: c.domain ?? null,
    emailDomain: c.email_domain ?? null,
    tickerSymbol: c.ticker_symbol ?? null,
    yearFounded: c.year_founded ?? null,
    numEmployees: c.num_employees ?? null,
    revenue: c.revenue ?? null,
    industry: c.industry ?? null,
    description: c.description ?? null,
    address: c.address ?? null,
    techstack: Array.isArray(c.techstack) ? c.techstack : [],
    company: c,
  };
}

export const SEARCH_OUTPUT_TAIL: OutputField[] = [
  { key: "count", type: "number", label: "Results on this page" },
  { key: "start", type: "number", label: "Start index of this page" },
  {
    key: "nextStart",
    type: "number",
    label: "Pass as Start for the next page; absent on the last",
  },
  { key: "total", type: "number", label: "Total matches, when the vendor reports it" },
];

export const COMPANY_LOOKUP_PARAMS: Param[] = [
  {
    key: "domain",
    label: "Domain",
    type: "string",
    hint: "The preferred key, e.g. rocketreach.co.",
  },
  { key: "id", label: "RocketReach company ID", type: "number" },
  { key: "name", label: "Company name", type: "string" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
  { key: "ticker", label: "Stock ticker", type: "string" },
];

export function companyLookupQuery(input: Obj): Obj {
  const q = compact({
    domain: input.domain,
    id: input.id,
    name: input.name,
    linkedin_url: input.linkedin_url,
    ticker: input.ticker,
  });
  if (Object.keys(q).length === 0) {
    throw new Error("Identify the company with a domain, ID, name, LinkedIn URL or ticker");
  }
  return q;
}

/** `ids` as comma/newline-separated text or an array → positive integers. */
export function parseIds(value: unknown, toListFn: (v: unknown) => string[]): number[] {
  const ids = toListFn(value).map((s) => Number(s));
  if (ids.length === 0) throw new Error("Give at least one profile ID");
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new Error("Profile IDs must be positive integers");
  }
  return ids;
}

export const CHECK_STATUS_OUTPUT: OutputField[] = [
  { key: "profiles", type: "array", label: "One entry per ID, with status and any revealed data" },
  { key: "count", type: "number", label: "Profiles returned" },
  { key: "pending", type: "number", label: "Profiles whose lookup has not finished" },
  { key: "allComplete", type: "boolean", label: "True when every profile is complete" },
];

export function statusOutput(body: unknown): Obj {
  const list = Array.isArray(body) ? body : [];
  const profiles = list.map(profileOutput);
  const pending = profiles.filter((p) => p.status !== "complete" && p.status !== "failed").length;
  return {
    profiles,
    count: profiles.length,
    pending,
    allComplete: profiles.length > 0 && profiles.every((p) => p.complete === true),
  };
}

export const BULK_PARAMS: Param[] = [
  {
    key: "queries",
    label: "Queries",
    type: "json",
    required: true,
    hint: "JSON array of 1-100 lookups, each identifying a person like Lookup Person: " +
      '[{"linkedin_url":"https://www.linkedin.com/in/benioff"},{"name":"A B","current_employer":"Acme"}]',
  },
  {
    key: "profile_list",
    label: "Profile list",
    type: "string",
    hint:
      'Name of the RocketReach list the profiles are added to (vendor default "API Bulk Lookup").',
  },
  {
    key: "webhook_id",
    label: "Webhook ID",
    type: "number",
    hint: "Post the results here when the lookups finish. Omitted, your top-most enabled " +
      "webhook is used.",
  },
];

export const BULK_OUTPUT: OutputField[] = [
  { key: "accepted", type: "boolean", label: "True when RocketReach accepted the batch" },
  { key: "queries", type: "number", label: "Number of lookups submitted" },
  { key: "requestId", type: "string", label: "RR-Request-ID, also sent with the webhook delivery" },
  { key: "response", type: "object", label: "The vendor's response body, when it sent one" },
];

export function bulkBody(
  input: Obj,
  parse: (v: unknown, label: string) => unknown,
): { body: Obj; count: number } {
  const queries = parse(input.queries, "Queries");
  if (!Array.isArray(queries) || queries.length < 1 || queries.length > 100) {
    throw new Error("Queries must be a JSON array of 1 to 100 lookups");
  }
  if (queries.some((q) => !q || typeof q !== "object" || Array.isArray(q))) {
    throw new Error("Every query must be a JSON object identifying one person");
  }
  const body = compact({
    queries,
    profile_list: input.profile_list,
    webhook_id: input.webhook_id,
  }) as Obj;
  return { body, count: queries.length };
}
