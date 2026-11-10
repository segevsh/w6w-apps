import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/landing-page-list.ts";

/**
 * `orderBy` accepts `id` with an optional `DESC` (Pardot v5 overview, "Query"); ids are assigned
 * in creation order, so `id DESC` is newest first.
 */
export default pollFromListAction({
  key: "new-landing-page",
  title: "New Landing Page",
  description: "The run gets each newly created Pardot landing page.",
  action,
  input: () => ({
    fields: "id,name,title,url,campaignId,formId,createdAt,updatedAt",
    orderBy: "id DESC",
    limit: 200,
  }),
  items: (r) => (r as { values?: unknown[] }).values ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Landing page ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "title", type: "string", label: "Title" },
    { key: "url", type: "string", label: "URL" },
    { key: "campaignId", type: "number", label: "Campaign ID" },
    { key: "formId", type: "number", label: "Form ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 301,
    name: "Spring webinar",
    title: "Join the spring webinar",
    url: "https://go.example.com/spring",
    campaignId: 12,
    formId: 45,
    createdAt: "2026-11-09T10:00:00-05:00",
    updatedAt: "2026-11-09T10:00:00-05:00",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
