import type { ActionDefinition } from "@w6w/types";
import { CONFIDENTIALITY, csv, LeverClient, query } from "../lib/client.ts";

/**
 * `GET /v1/opportunities` — the pipeline.
 *
 * ## The default filter is the reason this action has a required-feeling
 * parameter
 *
 * Lever: `confidentiality` "if unspecified, defaults to non-confidential". So
 * the obvious call returns fewer records than exist, with a 200 and nothing to
 * suggest it. This action defaults to **`all`** instead, and reports which
 * setting it used — because a count from this endpoint tends to end up in a
 * report.
 *
 * A key without confidential access sees the same shorter list either way,
 * which is the second, independent way to be missing rows. `auth.test` reports
 * that at connect time.
 *
 * ## An opportunity is an application, not a person
 *
 * Someone who applies to three postings is three opportunities and one
 * contact. `contactIds` here is the deduplicated set, and it is almost always
 * the number somebody means by "how many candidates".
 *
 * ## `offset` is an opaque token
 *
 * Lever returns `next` and accepts only a value it produced. This action
 * returns it as `nextCursor` and takes it back as `cursor` — there is no way
 * to jump to page five.
 */
const action: ActionDefinition = {
  key: "opportunity-list",
  type: "search",
  resource: "opportunity",
  title: "List opportunities",
  description:
    "The pipeline. Note Lever's `confidentiality` defaults to NON-CONFIDENTIAL, so the obvious " +
    "call silently omits records — this defaults to `all` and reports what it used. Returns the " +
    "deduplicated CONTACT ids, since one person can hold several opportunities.",
  params: [
    {
      key: "confidentiality",
      label: "Confidentiality",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All — confidential and not" },
        { value: "non-confidential", label: "Non-confidential only — Lever's own default" },
        { value: "confidential", label: "Confidential only" },
      ],
      hint: "Lever defaults to non-confidential, which quietly shortens the list. A key without " +
        "confidential access sees the shorter list regardless.",
    },
    {
      key: "postingId",
      label: "Posting ID",
      type: "string",
      default: "",
      hint: "Only candidates for this job.",
    },
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      default: "",
      hint: "From `stage-list`. Stage names are not accepted.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "Finds every opportunity for the contact with this email — which is how to ask " +
        "'has this person applied before'.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated and CASE SENSITIVE. Several tags are a union, not an intersection.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Active and archived" },
        { value: "false", label: "Active only" },
        { value: "true", label: "Archived only" },
      ],
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "contact",
      hint: "Comma-separated: contact, applications, stage, owner, followers, sourcedBy. " +
        "Without expanding, these come back as ids.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
      advanced: true,
      hint: "The `nextCursor` from a previous call. Lever's `offset` is a token it produced, not " +
        "a number you can compute.",
    },
  ],
  output: [
    { key: "opportunities", type: "array", label: "The opportunities" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "ids", type: "array", label: "Opportunity ids" },
    { key: "contactIds", type: "array", label: "Distinct people — usually the real count" },
    { key: "peopleCount", type: "number", label: "How many distinct contacts" },
    { key: "archivedCount", type: "number", label: "Archived opportunities in the result" },
    { key: "confidentialityUsed", type: "string", label: "Which filter this call applied" },
    { key: "nextCursor", type: "string", label: "Pass back as `cursor` for the next page" },
    { key: "hasNext", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const confidentiality = String(p.confidentiality ?? CONFIDENTIALITY.all);

    if (confidentiality === CONFIDENTIALITY.nonConfidential) {
      ctx.log(
        "info",
        "this call uses Lever's own default, which omits confidential opportunities — the " +
          "result is a subset and nothing in it says so",
        {},
      );
    }

    const page = await new LeverClient(ctx).list<{
      id?: string;
      name?: string;
      stage?: unknown;
      archived?: { reason?: string; archivedAt?: number } | null;
      contact?: string | { id?: string };
      confidentiality?: string;
    }>("/opportunities", {
      query: query({
        confidentiality,
        posting_id: String(p.postingId ?? "").trim(),
        stage_id: String(p.stageId ?? "").trim(),
        email: String(p.email ?? "").trim(),
        tag: csv(p.tags)?.join(","),
        archived: String(p.archived ?? ""),
        expand: csv(p.expand)?.join(","),
        limit: Math.max(1, Math.min(100, Number(p.limit ?? 100))),
        offset: String(p.cursor ?? "").trim(),
      }),
    });

    const opportunities = page.data;
    // One person, several applications: the contact is what deduplicates.
    const contactIds = [
      ...new Set(
        opportunities
          .map((opportunity) =>
            typeof opportunity?.contact === "string"
              ? opportunity.contact
              : opportunity?.contact?.id
          )
          .filter(Boolean) as string[],
      ),
    ];

    // Counts and ids. Candidate names and emails are personal data.
    ctx.log("info", "listed Lever opportunities", {
      count: opportunities.length,
      peopleCount: contactIds.length,
    });

    return {
      opportunities,
      count: opportunities.length,
      ids: opportunities.map((opportunity) => opportunity?.id).filter(Boolean),
      contactIds,
      peopleCount: contactIds.length,
      archivedCount: opportunities.filter((opportunity) => opportunity?.archived).length,
      confidentialityUsed: confidentiality,
      nextCursor: page.next,
      hasNext: page.hasNext,
    };
  },
};

export default action;
