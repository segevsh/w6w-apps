import { snapshotTrigger } from "../lib/polls.ts";
import listOrganizationMembers from "../actions/list-organization-members.ts";
import { MEMBER_OUTPUT, T5_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for team membership, and an organization has a bounded number of
 * members, so the whole list (`GET /organizations/{id}/members/`, read by
 * `list-organization-members`) is compared check to check.
 * https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newOrganizationMember = snapshotTrigger({
  key: "new-organization-member",
  title: "New Organization Member",
  description:
    "Checks an organization's members on a schedule. The run gets each member added since the previous check: name, email and role.",
  action: listOrganizationMembers,
  list: "members",
  paged: true,
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    hint: "The organization to watch.",
  }],
  input: (p) => ({ organizationId: String(p.organizationId ?? "").trim() }),
  output: MEMBER_OUTPUT,
  sample: T5_SAMPLE.members.members[0],
});

export default newOrganizationMember;
