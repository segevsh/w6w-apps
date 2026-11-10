import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import noteGetMany from "../actions/note-get-many.ts";

interface Note {
  id?: string | number;
  created_at?: number;
}

interface NotesPage {
  data?: Note[];
  pages?: { total_pages?: number };
}

/** Notes per request (`per_page` is a documented query parameter; the default is 15). */
const PER_PAGE = 50;
/** `PER_PAGE * MAX_PAGES` = the 5000-row cap of `pollSnapshot`; a longer list is refused. */
const MAX_PAGES = 100;

/**
 * `GET /contacts/{id}/notes` documents only `page` and `per_page` for the API version the client
 * pins (`intercom-version: 2.11`, https://developers.intercom.com/docs/references/2.11/rest-api/api.intercom.io/notes/listnotes,
 * verified 2026-11-10): no sort order is documented, so the newest note may sit on any page. The
 * trigger therefore does not depend on an order. Each check reads every page of the contact's notes
 * (bounded: more than `MAX_PAGES` pages is an error, never a silent truncation) and diffs the note
 * ids against the previous check (`pollSnapshot`, added only: an edited note must not read as new).
 */
const trigger: TriggerDefinition<{ contactId: string }> = {
  key: "new-note",
  title: "New Note on Contact",
  description:
    "Fires when a note is added to the contact you pick. The run gets the note (id, body, author, creation time).",
  params: [{
    key: "contactId",
    label: "Contact ID",
    type: "string",
    required: true,
    hint: "The Intercom contact whose notes to watch.",
  }],
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "body", type: "string", label: "Body (HTML)" },
    { key: "created_at", type: "number", label: "Created At (epoch seconds)" },
    { key: "author", type: "object", label: "Author (admin)" },
    { key: "contact", type: "object", label: "Contact" },
  ],
  sample: {
    type: "note",
    id: "17495962",
    created_at: 1762683400,
    contact: { type: "contact", id: "6543210fedcba9876543210f" },
    author: { type: "admin", id: "991267", name: "Ada Admin" },
    body: "<p>Asked about the annual plan.</p>",
  },
  async poll({ params, state }, ctx) {
    const byId = new Map<string, Note>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await noteGetMany.execute(
        { contactId: params.contactId, page, perPage: PER_PAGE },
        ctx,
      ) as NotesPage | null;
      const data = result?.data ?? [];
      for (const note of data) {
        if (note.id === undefined || note.id === "") continue;
        byId.set(String(note.id), note);
      }
      const totalPages = result?.pages?.total_pages;
      const more = data.length > 0 &&
        (typeof totalPages === "number" ? page < totalPages : data.length >= PER_PAGE);
      if (!more) break;
      if (page === MAX_PAGES) {
        throw new Error(
          `new-note: more than ${MAX_PAGES} pages of notes for this contact; watch a contact with fewer notes`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
      emit: { added: true, updated: false },
    });
    // Oldest first by creation time (stable: equal times keep the order they were read in).
    const added = events.map((e) => byId.get(e.key)!);
    added.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
    return { events: added, nextState };
  },
};

export default trigger;
