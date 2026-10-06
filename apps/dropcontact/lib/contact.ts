import { compact } from "./client.ts";

/** Input param key -> the vendor's snake_case request field. */
export const CONTACT_FIELDS: Record<string, string> = {
  email: "email",
  firstName: "first_name",
  lastName: "last_name",
  fullName: "full_name",
  phone: "phone",
  company: "company",
  website: "website",
  linkedin: "linkedin",
  companyLinkedin: "company_linkedin",
  numSiren: "num_siren",
  siret: "siret",
  country: "country",
  job: "job",
  customFields: "custom_fields",
};

export interface EmailEntry {
  email?: string;
  qualification?: string;
}

/** Build one `data[]` entry from the camelCase params, dropping empties. */
export function buildContact(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [param, field] of Object.entries(CONTACT_FIELDS)) {
    const v = input[param];
    if (typeof v === "string") {
      if (v.trim()) out[field] = v.trim();
    } else if (v !== undefined && v !== null) out[field] = v;
  }
  return compact(out);
}

/**
 * The email to use: the first `nominative@…` one (belongs to one individual), else the
 * first of any kind.
 */
export function primaryEmail(emails: unknown): EmailEntry | undefined {
  if (!Array.isArray(emails)) return undefined;
  const list = emails as EmailEntry[];
  return list.find((e) => /^nominative@/i.test(e?.qualification ?? "")) ?? list[0];
}

/** Batch-level options shared by the submit actions. */
export function batchOptions(raw: object): Record<string, unknown> {
  const input = raw as Record<string, unknown>;
  return compact({
    siren: input.siren === true ? true : undefined,
    language: typeof input.language === "string" ? input.language : undefined,
    custom_callback_url: typeof input.customCallbackUrl === "string"
      ? input.customCallbackUrl.trim()
      : undefined,
  });
}
