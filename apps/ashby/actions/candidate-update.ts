import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, json } from "../lib/client.ts";

/**
 * `POST /candidate.update` — correct a candidate's details.
 *
 * Two fields behave differently from the rest and both can lose data:
 *
 *   - **`socialLinks` replaces** the existing list rather than adding to it, so
 *     sending one link removes the others. It is exposed as JSON and labelled
 *     as a replacement.
 *   - **`sourceId` and `creditedToUserId` accept an explicit `null`** to unset
 *     them, which the usual "drop empty fields" compaction would swallow. This
 *     action takes the literal string `null` for that, the same convention the
 *     rest of this pack uses.
 *
 * `sendNotifications` decides whether people watching the candidate get an
 * email. For a bulk correction — fixing a hundred imported records — that is
 * a hundred notifications nobody wants, so it defaults to off here even though
 * Ashby's own default is on.
 */
const action: ActionDefinition = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update a candidate",
  description:
    "Correct a candidate's details. `socialLinks` REPLACES the existing list, and notifications " +
    "default to off here because a bulk correction should not email everyone.",
  idempotent: true,
  params: [
    { key: "candidateId", label: "Candidate ID", type: "string", required: true, default: "" },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "phoneNumber", label: "Phone Number", type: "string", default: "" },
    { key: "linkedInUrl", label: "LinkedIn URL", type: "string", default: "" },
    { key: "githubUrl", label: "GitHub URL", type: "string", default: "" },
    { key: "websiteUrl", label: "Website URL", type: "string", default: "" },
    {
      key: "alternateEmail",
      label: "Alternate Email",
      type: "string",
      default: "",
      advanced: true,
      hint: "Adds one alternate address.",
    },
    {
      key: "socialLinks",
      label: "Social Links (complete list)",
      type: "json",
      default: "",
      advanced: true,
      hint: "REPLACES every social link on the candidate. Include the ones you are keeping.",
    },
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      default: "",
      hint: "The literal `null` unsets the source.",
    },
    {
      key: "creditedToUserId",
      label: "Credited To (User ID)",
      type: "string",
      default: "",
      hint: "The literal `null` unsets it.",
    },
    { key: "location", label: "Location", type: "json", default: "", advanced: true },
    {
      key: "sendNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
      hint: "Ashby defaults this to on. Off here, because a bulk correction should not email " +
        "everyone watching a hundred candidates.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Candidate ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const candidateId = String(p.candidateId ?? "").trim();
    if (!candidateId) throw new Error("`candidateId` is required");

    // `null` has to survive the compaction that drops empty values, because
    // unsetting a source is a real, intended edit.
    const nullable = (v: unknown) => (String(v ?? "") === "null" ? null : v);

    const body = compact({
      name: p.name,
      email: p.email,
      phoneNumber: p.phoneNumber,
      linkedInUrl: p.linkedInUrl,
      githubUrl: p.githubUrl,
      websiteUrl: p.websiteUrl,
      alternateEmail: p.alternateEmail,
      socialLinks: json(p.socialLinks, "socialLinks"),
      location: json(p.location, "location"),
    });
    for (const key of ["sourceId", "creditedToUserId"] as const) {
      const value = nullable(p[key]);
      if (value === null) body[key] = null;
      else if (value !== undefined && value !== "") body[key] = value;
    }
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — give at least one field to change");
    }

    return await new AshbyClient(ctx).request("candidate.update", {
      body: {
        candidateId,
        ...body,
        sendNotifications: p.sendNotifications === true,
      },
    });
  },
};

export default action;
