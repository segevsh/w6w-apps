import tagContactsList from "../actions/tag-contacts-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/**
 * The run gets each contact newly given a tag (`GET /rest/v2/tags/{tag_id}/contacts`,
 * `order_by=applied_time desc`). The id carries `applied_time`, so a contact tagged again after the
 * tag was removed fires again. Brief 9.1 (a), a per-tag list where the tag is user-picked.
 */
export default feedTrigger({
  key: "new-tagged-contact",
  title: "Contact Tagged",
  description:
    "The run gets each contact newly given the chosen tag (`order_by=applied_time desc`).",
  action: tagContactsList,
  list: "contacts",
  orderBy: "applied_time desc",
  stamp: "applied_time",
  params: [{ key: "tagId", label: "Tag ID", type: "string", required: true, default: "" }],
  extra: (p) => ({ tagId: p.tagId }),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "applied_time", type: "string", label: "Tag applied at" },
  ],
  sample: {
    id: "9",
    email: "pat@example.com",
    given_name: "Pat",
    family_name: "Example",
    applied_time: "2026-11-10T12:00:00.000Z",
  },
});
