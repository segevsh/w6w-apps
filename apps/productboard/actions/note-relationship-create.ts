import type { ActionDefinition } from "@w6w/types";
import { compact, type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { noteIdParam, noteRelationshipTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/notes/{id}/relationships` — link a note to a customer or to a
 * feature.
 *
 * Linking a note to a feature is what Productboard calls creating an *insight*,
 * and it is the whole point of pushing feedback in: an unlinked note sits in the
 * inbox forever.
 *
 * **The target type for a product link is the literal string `"link"`.** Not
 * `"feature"`, not `"component"`, and not the type of whatever is being linked
 * — the vendor's `LinkTargetById` schema declares `type: {enum: ["link"]}`, and
 * every example in the document repeats it. This action fills that in
 * automatically, which is the main reason it exists rather than leaving callers
 * to hand-write the body.
 *
 * A `customer` relationship is the sensible mirror image: `target.type` really
 * is `user` or `company`, addressed by `id`, or a user by `email`.
 *
 * **Idempotent.** The same link twice is the same graph.
 */
interface Input {
  noteId: string;
  type: string;
  targetId?: string;
  targetEmail?: string;
  customerType?: string;
}

const noteRelationshipCreate: ActionDefinition<Input, DataResult> = {
  key: "note-relationship-create",
  type: "perform",
  resource: "note",
  title: "Link note",
  description:
    "Link a note to the customer it came from, or to a feature, subfeature, product or component " +
    "(creating an insight).",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "type",
      label: "Relationship type",
      type: "select",
      required: true,
      default: "link",
      options: noteRelationshipTypeOptions,
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      hint:
        "UUID of the entity, user or company. Required for a product link; for a customer you " +
        "may give an email instead.",
    },
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "company", label: "Company" },
      ],
      default: "user",
      hint:
        "Only used when the relationship type is `customer`. A company must be addressed by id; " +
        "only a user can be addressed by email.",
    },
    {
      key: "targetEmail",
      label: "Customer email",
      type: "string",
      hint: "Alternative to Target ID for a `customer` relationship targeting a user. The user " +
        "must already exist — v2 does not create one.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created relationship" }],

  async execute(input, ctx) {
    // For a product link the vendor's own target type is the literal "link";
    // for a customer it is user|company. Filled in here so a caller never has
    // to know that quirk.
    const target = input.type === "customer"
      ? compact({
        type: input.customerType ?? "user",
        id: input.targetId,
        email: input.targetEmail,
      })
      : compact({ type: "link", id: input.targetId });

    if (target.id === undefined && target.email === undefined) {
      throw new Error("Provide a Target ID (or, for a customer user, a Customer email)");
    }

    const data = await new ProductboardClient(ctx).data(
      `/notes/${encodeId(input.noteId)}/relationships`,
      { method: "POST", body: { data: { type: input.type, target } } },
    );
    return { data };
  },
};

export default noteRelationshipCreate;
