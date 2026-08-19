import type { ActionDefinition } from "@w6w/types";
import { LeverClient, query } from "../lib/client.ts";

/**
 * `GET /v1/postings` — the jobs.
 *
 * ## `state` is what decides whether a job is really open
 *
 * `published` is live on the careers site; `internal` is open and not
 * advertised; `closed` is finished; `draft` is not a job yet. A workflow
 * counting "open roles" wants published and internal, and the difference
 * between them is a hiring decision rather than a technicality.
 *
 * ## The same confidentiality default as opportunities
 *
 * Postings can be confidential too, and the same rule applies: unspecified
 * means non-confidential, so the obvious call returns a shorter list. This
 * action defaults to `all`.
 *
 * ## `content` is large, and `include` is exclusive
 *
 * A posting's full description is many kilobytes of HTML. Lever's `include`
 * parameter looks additive and is not — naming one field returns *only* that
 * field — so this action offers a plain boolean instead of letting somebody
 * discover that the hard way.
 */
const action: ActionDefinition = {
  key: "posting-list",
  type: "search",
  resource: "posting",
  title: "List postings",
  description:
    "The jobs. `state` distinguishes PUBLISHED from INTERNAL — both are open roles, and which " +
    "one is a hiring decision. Defaults confidentiality to `all`, since Lever's own default " +
    "quietly omits confidential postings.",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any state" },
        { value: "published", label: "Published — live on the careers site" },
        { value: "internal", label: "Internal — open, not advertised" },
        { value: "closed", label: "Closed" },
        { value: "draft", label: "Draft — not a job yet" },
        { value: "pending", label: "Pending approval" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    {
      key: "confidentiality",
      label: "Confidentiality",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "non-confidential", label: "Non-confidential only — Lever's own default" },
        { value: "confidential", label: "Confidential only" },
      ],
    },
    {
      key: "team",
      label: "Team",
      type: "string",
      default: "",
      hint: "Case sensitive, as Lever stores it.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
    },
    {
      key: "includeContent",
      label: "Include the full job description",
      type: "boolean",
      default: false,
      hint: "Many kilobytes of HTML per posting.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "postings", type: "array", label: "The postings" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "ids", type: "array", label: "Posting ids, which `opportunity-list` takes" },
    { key: "openRoles", type: "array", label: "Published and internal — the real open jobs" },
    { key: "byState", type: "object", label: "How many in each state" },
    { key: "teams", type: "array", label: "The distinct teams hiring" },
    { key: "nextCursor", type: "string", label: "Pass back as `cursor`" },
    { key: "hasNext", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const page = await new LeverClient(ctx).list<{
      id?: string;
      text?: string;
      state?: string;
      confidentiality?: string;
      categories?: { team?: string; location?: string; commitment?: string };
      urls?: { show?: string };
    }>("/postings", {
      query: query({
        state: String(p.state ?? ""),
        confidentiality: String(p.confidentiality ?? "all"),
        team: String(p.team ?? "").trim(),
        location: String(p.location ?? "").trim(),
        // `include` is exclusive, so it is only ever sent deliberately.
        include: p.includeContent === true ? "content" : undefined,
        limit: Math.max(1, Math.min(100, Number(p.limit ?? 100))),
        offset: String(p.cursor ?? "").trim(),
      }),
    });

    const postings = page.data;
    const byState: Record<string, number> = {};
    for (const posting of postings) {
      const state = String(posting?.state ?? "unknown");
      byState[state] = (byState[state] ?? 0) + 1;
    }

    // Both are open roles; the difference is whether the job is advertised.
    const openRoles = postings
      .filter((posting) => posting?.state === "published" || posting?.state === "internal")
      .map((posting) => posting?.text)
      .filter(Boolean);

    return {
      postings,
      count: postings.length,
      ids: postings.map((posting) => posting?.id).filter(Boolean),
      openRoles,
      byState,
      teams: [
        ...new Set(
          postings.map((posting) => posting?.categories?.team).filter(Boolean) as string[],
        ),
      ].sort(),
      nextCursor: page.next,
      hasNext: page.hasNext,
    };
  },
};

export default action;
