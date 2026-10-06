/**
 * The `lead` object of the three Reverse Lookup endpoints. Field names are the vendor's,
 * including `contructed_title` (sic — documented with that typo), renamed to
 * `constructedTitle`. `null` is returned when no lead was found.
 */
export function mapLead(lead: unknown) {
  if (!lead || typeof lead !== "object") return null;
  const l = lead as Record<string, unknown>;
  return {
    id: l.id,
    type: l.type,
    name: l.name,
    constructedTitle: l.contructed_title,
    title: l.title,
    profilePicture: l.profile_picture,
    linkedinUrl: l.linkedin_url,
    companyName: l.company_name,
    companyDomain: l.company_domain,
    addresses: l.addresses,
    totalExperienceInMonths: l.total_experience_in_months,
  };
}
