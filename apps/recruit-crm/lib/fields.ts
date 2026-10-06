import type { Field } from "./params.ts";

const s = (key: string, api: string, label: string, hint?: string): Field => ({
  key,
  api,
  label,
  type: "string",
  hint,
});
const n = (key: string, api: string, label: string, hint?: string): Field => ({
  key,
  api,
  label,
  type: "number",
  hint,
});

/**
 * Candidate body fields, from the `Candidate` schema of the OpenAPI document. Left out on
 * purpose: `resume` / `avatar` (file uploads), `salary_type` (an object whose write shape the
 * spec only shows as a response example) and `custom_fields` (an array the spec does not show
 * in a multipart body).
 */
export const candidateFields: Field[] = [
  s("firstName", "first_name", "First name"),
  s("lastName", "last_name", "Last name"),
  s("email", "email", "Email"),
  s("contactNumber", "contact_number", "Phone"),
  s("currentOrganization", "current_organization", "Current organization"),
  s("position", "position", "Position"),
  s("currentStatus", "current_status", "Current status"),
  s("specialization", "specialization", "Specialization"),
  s("skill", "skill", "Skills"),
  s("source", "source", "Source"),
  s("city", "city", "City"),
  s("locality", "locality", "Locality"),
  s("address", "address", "Address"),
  s("linkedin", "linkedin", "LinkedIn URL"),
  s("github", "github", "GitHub URL"),
  s("facebook", "facebook", "Facebook URL"),
  s("twitter", "twitter", "Twitter URL"),
  s("candidateDob", "candidate_dob", "Date of birth", "ISO-8601 date."),
  s("availableFrom", "available_from", "Available from", "ISO-8601 date."),
  n("workExYear", "work_ex_year", "Years of experience"),
  n("relevantExperience", "relevant_experience", "Relevant experience (years)"),
  n("currentSalary", "current_salary", "Current salary"),
  n("salaryExpectation", "salary_expectation", "Salary expectation"),
  n("noticePeriod", "notice_period", "Notice period"),
  n("currencyId", "currency_id", "Currency id", "From the Currencies list."),
  n("genderId", "gender_id", "Gender id"),
  n("qualificationId", "qualification_id", "Qualification id"),
  n("willingToRelocate", "willing_to_relocate", "Willing to relocate", "1 = yes, 0 = no."),
  n("ownerId", "owner_id", "Owner user id", "A user id from the Users list."),
];

/** Company body fields (`Company` schema; `slug`/`id`/audit columns are server-assigned). */
export const companyFields: Field[] = [
  s("companyName", "company_name", "Company name"),
  s("contactNumber", "contact_number", "Phone"),
  s("website", "website", "Website"),
  s("city", "city", "City"),
  s("address", "address", "Address"),
  s("linkedin", "linkedin", "LinkedIn URL"),
  s("facebook", "facebook", "Facebook URL"),
  s("twitter", "twitter", "Twitter URL"),
  n("industryId", "industry_id", "Industry id", "From the Industries list."),
  n("ownerId", "owner_id", "Owner user id"),
];

/** Contact body fields (`Contact` schema). */
export const contactFields: Field[] = [
  s("firstName", "first_name", "First name"),
  s("lastName", "last_name", "Last name"),
  s("email", "email", "Email"),
  s("contactNumber", "contact_number", "Phone"),
  s("designation", "designation", "Designation"),
  s("companySlug", "company_slug", "Company id", "Numeric id of the company this contact is at."),
  s("city", "city", "City"),
  s("locality", "locality", "Locality"),
  s("address", "address", "Address"),
  s("linkedin", "linkedin", "LinkedIn URL"),
  s("facebook", "facebook", "Facebook URL"),
  s("twitter", "twitter", "Twitter URL"),
  n("stageId", "stage_id", "Contact stage id"),
  n("ownerId", "owner_id", "Owner user id"),
];
