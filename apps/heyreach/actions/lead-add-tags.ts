import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient, stringList } from "../lib/client.ts";
import { linkedInIdParam } from "../lib/params.ts";

interface Input {
  leadProfileUrl?: string;
  leadLinkedInId?: string;
  tags: string[] | string;
  createTagIfNotExisting?: boolean;
}

/**
 * `POST /api/public/lead/AddTags` — attach tags to a lead.
 *
 * ## The lead is addressed two ways, and either will do
 *
 * The body carries `leadProfileUrl` **or** `leadLinkedInId`; the document marks
 * both "optional", meaning "supply the one you have" — the LinkedIn member id
 * (`linkedin_id`) skips a lookup, so it is the cheaper of the two.
 *
 * ## Existing tags are left alone
 *
 * The document says so verbatim ("Existing tags will not be changed"), which
 * makes a repeat call a no-op — `idempotent: true`. The response names only the
 * tags that were **newly** assigned (`newAssignedTags`), so a retry legitimately
 * answers with an empty list.
 *
 * ## `createTagIfNotExisting`
 *
 * With it off, a tag that does not exist yet is a `400` for the whole request —
 * so either turn it on, or create the tag vocabulary first. It is sent
 * explicitly rather than defaulted, because the two behaviours are different
 * and neither is obviously the "safe" one.
 */
const action: ActionDefinition<Input> = {
  key: "lead-add-tags",
  type: "perform",
  resource: "lead",
  title: "Add Tags to Lead",
  description:
    "Add tags to a lead by profile URL or LinkedIn id, optionally creating tags that do not " +
    "exist yet (POST /api/public/lead/AddTags).",
  idempotent: true,
  params: [
    {
      key: "leadProfileUrl",
      label: "LinkedIn profile URL",
      type: "string",
      placeholder: "https://www.linkedin.com/in/john-doe/",
      hint: "One of this or the LinkedIn member ID is needed.",
    },
    linkedInIdParam,
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string", placeholder: "customer" },
      required: true,
      hint: "The tags to add. Existing tags are left untouched.",
    },
    {
      key: "createTagIfNotExisting",
      label: "Create missing tags",
      type: "boolean",
      hint: "On: unknown tags are created. Off: an unknown tag fails the whole request with 400.",
    },
  ],
  output: [{ key: "newAssignedTags", type: "array", label: "Tags newly assigned to the lead" }],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/lead/AddTags", {
      method: "POST",
      body: compact({
        leadProfileUrl: input.leadProfileUrl,
        leadLinkedInId: input.leadLinkedInId,
        tags: stringList(input.tags),
        createTagIfNotExisting: input.createTagIfNotExisting,
      }),
    });
  },
};

export default action;
