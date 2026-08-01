import type { ActionDefinition } from "@w6w/types";
import { LinkedInClient, organizationUrn, personUrn } from "../lib/client.ts";

interface Input {
  authorType: "person" | "organization";
  authorId: string;
  count?: number;
  start?: number;
  sortBy?: "LAST_MODIFIED" | "CREATED";
}

/**
 * `GET /rest/posts?q=author&author=...` — the Posts API's author finder.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api#find-posts-by-authors
 *
 * Restricted regardless of auth method: listing a person's own posts needs
 * `r_member_social`, which LinkedIn grants to approved partners only ("This
 * permission is restricted and is available to approved users only" per the
 * Posts API permissions table); listing an organization's needs
 * `r_organization_social`, gated behind Community Management API approval
 * plus an admin/poster role on that page. Declared anyway because it's a
 * real, documented endpoint — expect `403` without that access.
 */
const listPostsByAuthor: ActionDefinition<Input> = {
  key: "list-posts-by-author",
  type: "read",
  resource: "post",
  title: "List Posts by Author",
  description: "Find posts by a person or organization URN. Requires r_member_social (person, " +
    "approved-partner only) or r_organization_social (organization, Community Management API).",
  params: [
    {
      key: "authorType",
      label: "Author Type",
      type: "select",
      required: true,
      default: "person",
      options: [
        { value: "person", label: "Person" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "authorId", label: "Author ID", type: "string", required: true },
    { key: "count", label: "Count", type: "number", default: 10, hint: "Max 100." },
    { key: "start", label: "Start (offset)", type: "number", default: 0 },
    {
      key: "sortBy",
      label: "Sort By",
      type: "select",
      default: "LAST_MODIFIED",
      options: [
        { value: "LAST_MODIFIED", label: "Last modified" },
        { value: "CREATED", label: "Created" },
      ],
    },
  ],
  output: [
    { key: "elements", type: "array", label: "Posts" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const author = input.authorType === "organization"
      ? organizationUrn(input.authorId)
      : personUrn(input.authorId);

    const client = new LinkedInClient(ctx);
    return client.request("/rest/posts", {
      restliMethod: "FINDER",
      query: {
        q: "author",
        author,
        count: input.count ?? 10,
        start: input.start ?? 0,
        sortBy: input.sortBy ?? "LAST_MODIFIED",
      },
    });
  },
};

export default listPostsByAuthor;
