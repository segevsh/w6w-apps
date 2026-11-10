import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postNotesList from "../actions/post-notes-list.ts";

/**
 * `GET /v2/blog/{blog-identifier}/notes?id=<post>`: "All [modes] return notes in reverse chronological
 * order" (https://www.tumblr.com/docs/en/api/v2, verified 2026-11-10), so page 1 holds the newest
 * likes, reblogs and replies. A note has no id of its own: it is identified by kind, blog and time.
 */
export default pollFromListAction<{ blogIdentifier: string; id: number }>({
  key: "new-post-note",
  title: "New Post Note",
  description: "The run gets each new like, reblog or reply on the chosen post.",
  action: postNotesList as unknown as ActionDefinition,
  input: (params) => ({ blogIdentifier: params.blogIdentifier, id: params.id, mode: "all" }),
  items: (result) => (result as { notes?: unknown[] }).notes ?? [],
  idOf: (item) => {
    const n = item as { type?: string; blog_uuid?: string; blog_name?: string; timestamp?: number };
    return `${n.type ?? ""}|${n.blog_uuid ?? n.blog_name ?? ""}|${n.timestamp ?? ""}`;
  },
  params: [
    { key: "blogIdentifier", type: "string", label: "Blog identifier", required: true },
    { key: "id", type: "number", label: "Post ID", required: true },
  ],
  output: [
    { key: "type", type: "string", label: "Note type (like, reblog, reply)" },
    { key: "blog_name", type: "string", label: "Blog name" },
    { key: "timestamp", type: "number", label: "Epoch seconds" },
  ],
  sample: { type: "like", blog_name: "david", blog_uuid: "t:abc123", timestamp: 1308781073 },
  maxPages: 1,
});
