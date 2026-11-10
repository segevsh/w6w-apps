import { walkTrigger } from "../lib/walk.ts";
import contactList from "../actions/contact-list.ts";

const PAGE = 1000;
type Contact = { id?: unknown; regDate?: unknown };
const lastId = (got: unknown[]): number | undefined => {
  const id = Number((got[got.length - 1] as Contact | undefined)?.id);
  return Number.isFinite(id) && id > 0 ? id : undefined;
};
const crawl = (afterId: unknown) => ({
  limit: PAGE,
  sort: "id",
  filter: { id: `gt:${Number(afterId) || 0}` },
});

/**
 * Upsales documents no descending sort, only the id crawl (`sort=id` + `id=gt:<last id>`; see the
 * `offset` hint of `contact-list`, and https://api.upsales.com). So the trigger keeps the last
 * contact id it read and asks for the contacts above it, ascending.
 */
export default walkTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: contactList as never,
  first: ({ mark }) => crawl(mark),
  next: (_req, _result, got) => (got.length >= PAGE ? crawl(lastId(got)) : undefined),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as Contact).id ?? ""),
  stampOf: (i) => {
    const t = Date.parse(String((i as Contact).regDate ?? ""));
    return Number.isNaN(t) ? undefined : t;
  },
  markOf: (prev, read) => lastId(read) ?? prev,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "regDate", type: "string", label: "Created at" },
  ],
  sample: { id: 1234, name: "Ada Lovelace", email: "ada@example.com", regDate: "2026-11-09" },
});
