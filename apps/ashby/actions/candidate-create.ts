import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv, json } from "../lib/client.ts";

/**
 * `POST /candidate.create` — add a person to the ATS.
 *
 * ## Search before you create
 *
 * Ashby does **not** deduplicate on create: calling this twice with the same
 * email produces two candidate records, and from then on the person's history
 * is split across both — interviews on one, the offer on the other. Merging
 * them is manual work in the Ashby app.
 *
 * So the correct shape for an inbound-lead or referral workflow is
 * `candidate-search` by email, then this only if nothing came back. This action
 * cannot enforce that, but the parameter hint and this note are where the
 * warning belongs.
 *
 * ## `sourceId` and `creditedToUserId` are what make sourcing measurable
 *
 * Where a candidate came from, and who gets credit, are the two fields a
 * recruiting team actually reports on. A workflow that creates candidates
 * without them produces a pipeline full of records attributed to nobody.
 * `source-list` and `user-list` map the names to ids.
 */
const action: ActionDefinition = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create a candidate",
  description:
    "Add a person to Ashby. It does NOT deduplicate — creating twice with the same email splits " +
    "one person's history across two records. Search first.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "First and last.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "Search by this first — Ashby will happily create a second record for the same " +
        "address.",
    },
    { key: "phoneNumber", label: "Phone Number", type: "string", default: "" },
    { key: "linkedInUrl", label: "LinkedIn URL", type: "string", default: "" },
    { key: "githubUrl", label: "GitHub URL", type: "string", default: "" },
    { key: "website", label: "Website", type: "string", default: "" },
    {
      key: "alternateEmailAddresses",
      label: "Alternate Emails",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      default: "",
      hint: "Where they came from — the field sourcing reports are built on. `source-list` maps " +
        "names to ids.",
    },
    {
      key: "creditedToUserId",
      label: "Credited To (User ID)",
      type: "string",
      default: "",
      hint: "Who gets credit for the referral or sourcing.",
    },
    {
      key: "location",
      label: "Location",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. {"city":"Berlin","country":"Germany"}',
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "datetime",
      default: "",
      advanced: true,
      hint: "An ISO date string — NOT the Unix milliseconds that Ashby's filters take. Use it " +
        "when importing history, so a migrated candidate keeps their real date.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Candidate ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const candidate = await new AshbyClient(ctx).request<{ id?: string }>("candidate.create", {
      body: compact({
        name,
        email: p.email,
        phoneNumber: p.phoneNumber,
        linkedInUrl: p.linkedInUrl,
        githubUrl: p.githubUrl,
        website: p.website,
        alternateEmailAddresses: csv(p.alternateEmailAddresses),
        sourceId: p.sourceId,
        creditedToUserId: p.creditedToUserId,
        location: json(p.location, "location"),
        createdAt: p.createdAt,
      }),
    });

    // The id, never the person.
    ctx.log("info", "created an Ashby candidate", { candidateId: candidate?.id });
    return candidate;
  },
};

export default action;
