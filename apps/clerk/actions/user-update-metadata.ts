import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact, json } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `PATCH /users/{user_id}/metadata` — a **deep merge**, not a replace.
 *
 * Nested objects merge key-by-key at every depth; setting a key's value to `null` removes just
 * that key. There is a `PUT` variant that replaces a metadata field wholesale, but it is not
 * exposed here — it is a much easier way to lose sibling keys by accident than the merge form is
 * to get wrong.
 */
const action: ActionDefinition = {
  key: "user-update-metadata",
  type: "perform",
  resource: "user",
  title: "Update user metadata",
  description: "Deep-merge public/private/unsafe metadata onto a user. Set a key to null to " +
    "remove it.",
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "publicMetadata",
      label: "Public metadata",
      type: "json",
      default: "",
      hint: "Visible to both the Frontend and Backend API. Merged into the existing value.",
    },
    {
      key: "privateMetadata",
      label: "Private metadata",
      type: "json",
      default: "",
      hint: "Visible only to the Backend API. Merged into the existing value.",
    },
    {
      key: "unsafeMetadata",
      label: "Unsafe metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Writable from the Frontend API too, so not guaranteed safe. Merged into the " +
        "existing value.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "public_metadata", type: "object", label: "Public metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    const body = compact({
      public_metadata: json(p.publicMetadata, "publicMetadata"),
      private_metadata: json(p.privateMetadata, "privateMetadata"),
      unsafe_metadata: json(p.unsafeMetadata, "unsafeMetadata"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("provide at least one of publicMetadata, privateMetadata, unsafeMetadata");
    }

    return await new ClerkClient(ctx).request(
      `/users/${encodeURIComponent(userId)}/metadata`,
      { method: "PATCH", body },
    );
  },
};
export default action;
