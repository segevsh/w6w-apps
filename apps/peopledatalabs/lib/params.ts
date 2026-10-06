import type { Param } from "@w6w/types";

/** Opt-in switch for the free sandbox host. */
export const sandboxParam: Param = {
  key: "sandbox",
  label: "Use sandbox",
  type: "boolean",
  default: false,
  hint:
    "Call sandbox.api.peopledatalabs.com instead: free, no credits, a small fixed dataset, 5 calls/minute. For wiring up a flow before spending credits.",
};

export const titlecaseParam: Param = {
  key: "titlecase",
  label: "Title-case text",
  type: "boolean",
  default: false,
  hint: "PDL lowercases all response text by default; set to title-case it.",
};

export const dataIncludeParam = (what: string): Param => ({
  key: "data_include",
  label: "Fields to return",
  type: "string",
  hint:
    `Comma-separated ${what} fields to keep, dot notation for subfields (full_name,emails.address). Start with - to exclude instead.`,
});

const str = (key: string, label: string, hint?: string, placeholder?: string): Param => ({
  key,
  label,
  type: "string",
  ...(hint ? { hint } : {}),
  ...(placeholder ? { placeholder } : {}),
});

/** Person match inputs shared by enrich, preview and identify (identify lacks `pdl_id`). */
export const PERSON_MATCH_KEYS = [
  "name",
  "first_name",
  "last_name",
  "middle_name",
  "email",
  "email_hash",
  "phone",
  "profile",
  "lid",
  "company",
  "school",
  "location",
  "street_address",
  "locality",
  "region",
  "country",
  "postal_code",
  "birth_date",
] as const;

export const personMatchParams: Param[] = [
  str("name", "Full name", "At least first and last name.", "Jennifer C. Jackson"),
  str("first_name", "First name"),
  str("last_name", "Last name"),
  str("middle_name", "Middle name"),
  str("email", "Email", "An email the person has used.", "sean@peopledatalabs.com"),
  str("email_hash", "Email hash", "SHA-256 or MD5 hash of the email."),
  str("phone", "Phone", "Must begin with +[country code], or nothing matches.", "+1 555-234-1234"),
  str("profile", "Social profile URL", "e.g. a LinkedIn URL.", "linkedin.com/in/seanthorne"),
  str("lid", "LinkedIn ID", "The person's numeric LinkedIn ID."),
  str("company", "Company", "Name, website or social URL of a company they have worked at."),
  str("school", "School", "Name, website or social URL of a school they attended."),
  str("location", "Location", "Anything from a street address to a country.", "Medford, OR USA"),
  str("street_address", "Street address"),
  str("locality", "City"),
  str("region", "State / region"),
  str("country", "Country"),
  str("postal_code", "Postal code", "Assumed to be US when no country is given."),
  str("birth_date", "Birth date", "A year, or YYYY-MM-DD."),
];

export const PERSON_MATCH_HINT =
  "Needs at least one of profile, email, phone, email_hash, lid, pdl_id, or a name together with a company, school, location, street address, city, region, country, postal code or birth date.";

export const pdlIdParam: Param = str(
  "pdl_id",
  "PDL ID",
  "A PDL persistent ID. When set, every other match input is ignored.",
);

export const personEnrichOptionParams: Param[] = [
  {
    key: "min_likelihood",
    label: "Minimum likelihood",
    type: "number",
    validation: { min: 1, max: 10, integer: true },
    hint:
      "1-10, default 2. Higher means fewer but surer matches (>= 6 for accuracy-critical use); below the threshold the answer is a no-match.",
  },
  str(
    "required",
    "Required fields",
    "Boolean expression over top-level fields a match must have, e.g. `emails AND experience`. You are only charged for matches that satisfy it.",
  ),
  dataIncludeParam("person"),
  {
    key: "include_if_matched",
    label: "Report matched inputs",
    type: "boolean",
    default: false,
    hint: "Adds a `matched` list naming which of your inputs matched the record.",
  },
  titlecaseParam,
];
