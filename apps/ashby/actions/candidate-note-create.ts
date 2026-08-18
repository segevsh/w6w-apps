import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /candidate.createNote` — write a note on a candidate's profile.
 *
 * This is how an automation says something to the humans. A screening tool's
 * verdict, a background-check result, a "they replied to the outreach on
 * LinkedIn" — the recruiter reads it in Ashby beside everything else rather
 * than in a system they do not have open.
 *
 * ## Two flags with real consequences
 *
 * **`isPrivate`** restricts the note to people with private-field access, and
 * requires the API key to have that permission — which is **off by default** on
 * Ashby keys. A private note attempted without it is refused, not silently
 * downgraded to public, which is the right failure.
 *
 * **`sendNotifications`** emails everyone subscribed to the candidate. For a
 * single meaningful note that is the point; for a bulk annotation run it is a
 * mailbox full of noise, so it defaults to off.
 *
 * The note body accepts plain text, or `{type, value}` where `type` is
 * `text/plain` or `text/html`.
 */
const action: ActionDefinition = {
  key: "candidate-note-create",
  type: "perform",
  resource: "candidate",
  title: "Add a note to a candidate",
  description:
    "Write on a candidate's profile — how an automation tells the recruiter something where " +
    "they will actually see it. Private notes need a key permission that is off by default.",
  idempotent: false,
  params: [
    { key: "candidateId", label: "Candidate ID", type: "string", required: true, default: "" },
    {
      key: "note",
      label: "Note",
      type: "text",
      required: true,
      default: "",
      hint: "Plain text. HTML is possible via Ashby's `{type, value}` form; this sends plain.",
    },
    {
      key: "isPrivate",
      label: "Private",
      type: "boolean",
      default: false,
      hint: "Restricted to people with private-field access. Requires that permission on the " +
        "API key, which Ashby leaves OFF by default — without it the call is refused.",
    },
    {
      key: "sendNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
      hint: "Emails everyone watching the candidate. Right for one meaningful note, wrong for a " +
        "bulk annotation run.",
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "datetime",
      default: "",
      advanced: true,
      hint: "An ISO date string, for importing historical notes in their real order.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "createdAt", type: "string", label: "When it was recorded" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const candidateId = String(p.candidateId ?? "").trim();
    if (!candidateId) throw new Error("`candidateId` is required");
    const note = String(p.note ?? "").trim();
    if (!note) throw new Error("`note` is required — an empty note is not worth a request");

    const created = await new AshbyClient(ctx).request<{ id?: string }>("candidate.createNote", {
      body: compact({
        candidateId,
        note,
        isPrivate: p.isPrivate === true ? true : undefined,
        sendNotifications: p.sendNotifications === true,
        createdAt: p.createdAt,
      }),
    });

    // The ids, never the note text — it may be a screening verdict about a person.
    ctx.log("info", "added an Ashby candidate note", { candidateId, noteId: created?.id });
    return created;
  },
};

export default action;
