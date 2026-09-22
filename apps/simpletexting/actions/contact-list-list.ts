import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/contact-lists` — "Get all Lists".
 *
 * A page of `List` rows. The identifier is **`listId`** (the create response
 * answers `{id}` instead — the vendor's own inconsistency, not a typo here),
 * and the row carries the four counts a workflow usually needs before mailing a
 * list: `totalContactsCount`, `activeContactsCount`, `invalidContactsCount` and
 * `unsubscribedContactsCount`. The document does not say which of them a
 * campaign reaches, so they are returned as the vendor sends them rather than
 * collapsed into one "reachable" number this app would be inventing.
 *
 * `keywords` names the texting keywords that route into this list — a list
 * created automatically by a keyword carries a `description` saying so, and a
 * manually created one has a null description.
 */
interface Input {
  page?: number;
  size?: number;
}

const contactListList: ActionDefinition<Input> = {
  key: "contact-list-list",
  type: "search",
  resource: "contact-list",
  title: "List Contact Lists",
  description: "List the account's contact lists, with their membership counts.",
  params: paginationParams(),
  output: [
    { key: "content", type: "array", label: "Lists" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/contact-lists", {
      query: { page: input.page, size: input.size },
    });
  },
};

export default contactListList;
