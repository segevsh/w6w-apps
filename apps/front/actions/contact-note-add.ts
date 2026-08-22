import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";

/**
 * `POST /contacts/{contact_id}/notes` — verified against Front's own OpenAPI
 * document (`add-contact-note`).
 *
 * A note lives on the **person**, not on a conversation: it shows in the
 * contact panel beside every thread they ever open, which is where "this
 * customer is on the enterprise plan" or "billing dispute open since March"
 * belongs. A comment, by contrast, is buried in whichever conversation it was
 * written on.
 *
 * **`author_id` is required here** — unusually, since the comment route lets it
 * default to the API token. Front will not accept an anonymous note, so a
 * workflow posting one has to nominate a teammate to own it.
 */
const action: ActionDefinition = {
  key: "contact-note-add",
  type: "perform",
  resource: "contact",
  title: "Add contact note",
  description:
    "Attach a note to the person, visible beside every conversation they open — unlike a " +
    "comment, which stays on one thread.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID or Handle Alias",
      type: "string",
      required: true,
      default: "",
      placeholder: "alt:email:ada@example.com",
    },
    { key: "body", label: "Note", type: "text", required: true, default: "" },
    {
      key: "authorId",
      label: "Author",
      type: "string",
      required: true,
      default: "",
      placeholder: "tea_55c8c149",
      hint: "Required by Front — a note must belong to a teammate. An `alt:email:…` alias works.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "body", type: "string", label: "Body" },
    { key: "author", type: "object", label: "Author" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contactId = String(p.contactId ?? "");
    if (!contactId) throw new Error("`contactId` is required");
    const body = String(p.body ?? "");
    if (!body.trim()) throw new Error("`body` is required");
    const authorId = String(p.authorId ?? "").trim();
    if (!authorId) {
      throw new Error("`authorId` is required — Front will not accept a note without a teammate");
    }

    ctx.log("info", "adding Front contact note", { contactId });
    return await new FrontClient(ctx).request(
      `/contacts/${encodeURIComponent(contactId)}/notes`,
      { method: "POST", body: { body, author_id: authorId } },
    );
  },
};

export default action;
