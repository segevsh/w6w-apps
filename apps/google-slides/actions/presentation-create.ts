import type { ActionDefinition } from "@w6w/types";
import { GoogleSlidesClient } from "../lib/client.ts";

interface Input {
  title: string;
  presentationId?: string;
}

/**
 * `presentations.create` — POST /v1/presentations
 *
 * The discovery document is blunt about what this does: "Creates a blank
 * presentation using the title given in the request. If a `presentationId` is
 * provided, it is used as the ID of the new presentation. Otherwise, a new ID
 * is generated. **Other fields in the request, including any provided content,
 * are ignored.**"
 *
 * So exactly two fields are honoured, and this action exposes exactly those
 * two. `pageSize`, `locale`, `slides`, `masters` and `layouts` all exist on the
 * `Presentation` schema and are all silently dropped here — sending them would
 * be a lie about what the call does. Content is a follow-up `:batchUpdate`.
 *
 * Note there is no `parents` / folder field: Slides' own create method cannot
 * place the file in a Drive folder. Move it afterwards with the `google-drive`
 * app rather than widening this app's OAuth grant to Drive.
 */
const presentationCreate: ActionDefinition<Input> = {
  key: "presentation-create",
  type: "perform",
  resource: "presentation",
  title: "Create Presentation",
  description: "Create a new, blank Google Slides presentation with a title.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "The presentation title. This is also the file name in Drive.",
    },
    {
      key: "presentationId",
      label: "Presentation ID",
      type: "string",
      advanced: true,
      hint:
        "Optional. Supply your own ID for the new presentation instead of letting Google generate one.",
    },
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "revisionId", type: "string", label: "Revision ID" },
    { key: "pageSize", type: "object", label: "Page size" },
    { key: "slides", type: "array", label: "Slides (one blank slide)" },
    { key: "layouts", type: "array", label: "Layouts" },
    { key: "masters", type: "array", label: "Masters" },
    { key: "locale", type: "string", label: "Locale" },
  ],

  execute(input, ctx) {
    const client = new GoogleSlidesClient(ctx);
    const body: Record<string, unknown> = { title: input.title };
    if (input.presentationId) body.presentationId = input.presentationId;
    return client.request("/presentations", { method: "POST", body });
  },
};

export default presentationCreate;
