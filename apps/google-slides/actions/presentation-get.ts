import type { ActionDefinition } from "@w6w/types";
import { extractPresentationId, GoogleSlidesClient } from "../lib/client.ts";

interface Input {
  presentationId: string;
}

/**
 * `presentations.get` — GET /v1/presentations/{presentationId}
 *
 * Returns the whole `Presentation`: title, pageSize, locale, revisionId, and
 * every `slides[]`, `layouts[]`, `masters[]` and `notesMaster` page with all of
 * their page elements. The discovery document lists `presentationId` as the
 * method's only parameter — there is no field mask on this method, so the full
 * document always comes back and can be large for a long deck.
 *
 * This is also the action you use to discover object IDs: every write in this
 * app addresses slides and elements by the `objectId` values found here.
 */
const presentationGet: ActionDefinition<Input> = {
  key: "presentation-get",
  type: "read",
  resource: "presentation",
  title: "Get Presentation",
  description:
    "Fetch a presentation's metadata plus every slide, layout and master — including the object IDs the write actions need.",
  params: [
    {
      key: "presentationId",
      label: "Presentation ID or URL",
      type: "string",
      required: true,
      hint: "A raw presentation ID, or the /presentation/d/<id>/edit URL from your browser.",
    },
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "pageSize", type: "object", label: "Page size" },
    { key: "slides", type: "array", label: "Slides" },
    { key: "layouts", type: "array", label: "Layouts" },
    { key: "masters", type: "array", label: "Masters" },
    { key: "notesMaster", type: "object", label: "Notes master" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "revisionId", type: "string", label: "Revision ID" },
  ],

  execute(input, ctx) {
    const client = new GoogleSlidesClient(ctx);
    return client.request(
      `/presentations/${encodeURIComponent(extractPresentationId(input.presentationId))}`,
    );
  },
};

export default presentationGet;
