import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/looks` — the saved Looks this user can see.
 *
 * ## "Can see" is doing a lot of work here
 *
 * The list is filtered by the credential's Looker user, its role, and the
 * folders that user has access to. Two connections against the same instance
 * legitimately return different Looks, and neither is wrong. A workflow that
 * "cannot find" a Look is usually looking with the wrong user rather than at
 * the wrong instance.
 *
 * ## `public` means a URL that needs no login
 *
 * A Look marked public has a `public_url` that serves its results to anybody
 * who has it, with no Looker account. That is a deliberate feature and it is
 * also business data on an unauthenticated URL, so this counts them.
 *
 * ## Deleted Looks are soft-deleted and still listed
 *
 * `deleted: true` with a `deleted_at`. They are recoverable — genuinely unusual
 * — and they still come back from this endpoint, so a count of "our Looks" that
 * does not filter them is wrong.
 */
const action: ActionDefinition = {
  key: "look-list",
  type: "search",
  resource: "look",
  title: "List Looks",
  description:
    "Saved Looks visible to this credential's Looker USER — two connections legitimately see " +
    "different sets. Counts the PUBLIC ones, whose URLs need no login, and excludes the " +
    "soft-deleted ones the API still returns.",
  params: [
    {
      key: "title",
      label: "Title Contains",
      type: "string",
      default: "",
      hint: "Matched here, case-insensitively.",
    },
    {
      key: "includeDeleted",
      label: "Include soft-deleted",
      type: "boolean",
      default: false,
      hint: "Looker soft-deletes Looks and still returns them — they are recoverable.",
    },
  ],
  output: [
    { key: "looks", type: "array", label: "The Looks" },
    { key: "count", type: "number", label: "Matching" },
    { key: "ids", type: "array", label: "Just the ids" },
    { key: "publicCount", type: "number", label: "How many serve results without a login" },
    { key: "publicLooks", type: "array", label: "Those Looks' titles" },
    { key: "deletedCount", type: "number", label: "Soft-deleted, and recoverable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new LookerClient(ctx).request<
      Array<{
        id?: string;
        title?: string;
        public?: boolean;
        deleted?: boolean;
        updated_at?: string;
        folder?: { name?: string };
      }>
    >("/looks", {
      query: { fields: "id,title,public,deleted,updated_at,folder(name)" },
    });

    const list = Array.isArray(all) ? all : [];
    const deleted = list.filter((look) => look?.deleted === true);
    const visible = p.includeDeleted === true
      ? list
      : list.filter((look) => look?.deleted !== true);

    const needle = String(p.title ?? "").trim().toLowerCase();
    const looks = needle
      ? visible.filter((look) => String(look?.title ?? "").toLowerCase().includes(needle))
      : visible;

    // A public Look serves business data to anybody with the URL.
    const publicLooks = looks.filter((look) => look?.public === true);
    if (publicLooks.length) {
      ctx.log(
        "warn",
        "some Looks are public — their results are served to anybody with the URL, with no " +
          "Looker account",
        { publicCount: publicLooks.length },
      );
    }

    return {
      looks,
      count: looks.length,
      ids: looks.map((look) => look?.id).filter(Boolean),
      publicCount: publicLooks.length,
      publicLooks: publicLooks.map((look) => look?.title).filter(Boolean),
      deletedCount: deleted.length,
    };
  },
};

export default action;
