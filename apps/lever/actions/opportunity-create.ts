import type { ActionDefinition } from "@w6w/types";
import { assertPerformAs, compact, csv, LeverClient, query } from "../lib/client.ts";

/**
 * `POST /v1/opportunities` — add a candidate.
 *
 * ## An email that matches never creates a person
 *
 * Lever's words: "If an email address is provided, we will always attempt to
 * dedupe the candidate. If a match is found, we will create a new Opportunity
 * that is linked to the existing matching candidate's contact (i.e. we never
 * create a new contact, or person, if a match has been found). **The existing
 * candidate's contact data will take precedence over new manually provided
 * information.**"
 *
 * So this is not an upsert of a person. A create carrying a corrected phone
 * number or a new name against a known email keeps the *old* values and
 * returns success. Whatever a workflow believed it was fixing is unfixed, and
 * the response looks identical to a fresh candidate.
 *
 * This action reports whether the contact it ended up on already existed, so
 * that distinction is at least visible.
 *
 * ## `perform_as` is required, and it is the only required parameter
 *
 * Lever: "All query parameters except the `perform_as` parameter are
 * optional." Every candidate has an owner in Lever's audit trail, and this
 * decides who it is. A workflow without a deliberate answer creates candidates
 * attributed to whoever set the integration up.
 *
 * ## Creating is not applying
 *
 * This adds a candidate to the account. Attaching them to a job posting is the
 * `postings` field; without one they sit in the pipeline attached to nothing,
 * which is a real state and rarely the intended one.
 */
const action: ActionDefinition = {
  key: "opportunity-create",
  type: "perform",
  resource: "opportunity",
  title: "Create an opportunity",
  description:
    "Add a candidate. Lever DEDUPES on email and never creates a second person — and the " +
    "existing contact's data wins, so a create carrying a corrected phone number silently keeps " +
    "the old one. Requires `performAs`, which decides who the audit trail credits.",
  idempotent: false,
  params: [
    {
      key: "performAs",
      label: "Perform as (user ID)",
      type: "string",
      required: true,
      default: "",
      hint: "A Lever user's UUID, from `user-list`. Lever refuses a create without it, and it " +
        "decides who owns the candidate.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Ignored if the email matches an existing contact — theirs wins.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      default: "",
      hint: "Comma-separated. A match here means an opportunity on the EXISTING person rather " +
        "than a new one.",
    },
    { key: "phones", label: "Phones", type: "string", default: "" },
    {
      key: "postingIds",
      label: "Posting IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Without one the candidate is in the account and attached to no job.",
    },
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      default: "",
      hint: "Where in the pipeline to place them. Defaults to the first stage.",
    },
    { key: "tags", label: "Tags", type: "string", default: "" },
    { key: "sources", label: "Sources", type: "string", default: "" },
    {
      key: "origin",
      label: "Origin",
      type: "select",
      default: "sourced",
      options: [
        { value: "sourced", label: "Sourced" },
        { value: "applied", label: "Applied" },
        { value: "referred", label: "Referred" },
        { value: "university", label: "University" },
        { value: "agency", label: "Agency" },
        { value: "internal", label: "Internal" },
      ],
    },
    {
      key: "links",
      label: "Links",
      type: "string",
      default: "",
      hint: "Comma-separated URLs — a LinkedIn profile, a portfolio.",
    },
  ],
  output: [
    { key: "opportunity", type: "object", label: "What Lever created" },
    { key: "id", type: "string", label: "The opportunity id" },
    { key: "contactId", type: "string", label: "The person it belongs to" },
    { key: "deduped", type: "boolean", label: "Whether it landed on an existing person" },
    { key: "name", type: "string", label: "The name Lever kept" },
    { key: "attachedToPosting", type: "boolean", label: "Whether it is on a job at all" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const performAs = assertPerformAs(p.performAs);

    const emails = csv(p.emails) ?? [];
    const postings = csv(p.postingIds) ?? [];
    if (!postings.length) {
      ctx.log(
        "info",
        "this candidate is being created without a posting, so they will sit in the account " +
          "attached to no job — a real state, and rarely the intended one",
        {},
      );
    }

    const client = new LeverClient(ctx);

    // Whether this is a new person or another application by a known one.
    let existingContactId: string | undefined;
    if (emails.length) {
      try {
        const existing = await client.list<{ contact?: string | { id?: string } }>(
          "/opportunities",
          { query: { email: emails[0], limit: 1, confidentiality: "all" } },
        );
        const contact = existing.data[0]?.contact;
        existingContactId = typeof contact === "string" ? contact : contact?.id;
      } catch { /* the lookup is context, not a gate */ }
    }
    if (existingContactId) {
      ctx.log(
        "info",
        "an existing contact already has this email, so Lever will add an opportunity to that " +
          "person rather than creating one — and THEIR name, phone and details take precedence " +
          "over anything supplied here",
        {},
      );
    }

    const created = await client.one<{
      id?: string;
      name?: string;
      contact?: string | { id?: string };
      applications?: unknown[];
    }>("/opportunities", {
      method: "POST",
      query: query({ perform_as: performAs }),
      body: compact({
        name: String(p.name ?? "").trim(),
        emails,
        phones: (csv(p.phones) ?? []).map((value) => ({ value })),
        postings,
        stage: String(p.stageId ?? "").trim(),
        tags: csv(p.tags),
        sources: csv(p.sources),
        origin: String(p.origin ?? "sourced"),
        links: csv(p.links),
      }),
    });

    const contact = created?.contact;
    const contactId = typeof contact === "string" ? contact : contact?.id;

    // Ids only. A candidate's name and email are personal data.
    ctx.log("info", "created a Lever opportunity", {
      id: created?.id,
      deduped: Boolean(existingContactId),
    });

    return {
      opportunity: created,
      id: created?.id,
      contactId,
      deduped: Boolean(existingContactId && contactId === existingContactId),
      name: created?.name,
      attachedToPosting: postings.length > 0,
    };
  },
};

export default action;
