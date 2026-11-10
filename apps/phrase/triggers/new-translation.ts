import translationList from "../actions/translation-list.ts";
import { projectIdParam, sortedTrigger } from "../lib/depth.ts";

// GET /projects/{project_id}/translations takes `sort=created_at&order=desc`
// (https://developers.phrase.com/en/api/strings/translations/list-translations, verified 2026-11-10);
// page 1 of 100 is the newest-first feed.
export default sortedTrigger<{ projectId: string }>({
  key: "new-translation",
  title: "New Translation",
  description: "The run gets each newly created translation in the chosen project.",
  action: translationList as never,
  params: [projectIdParam],
  sort: { sort: "created_at", order: "desc" },
  output: [
    { key: "id", type: "string", label: "Translation ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "locale", type: "object", label: "Locale" },
    { key: "key", type: "object", label: "Key" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "translation-sample-1",
    content: "Welcome",
    locale: { id: "locale-sample-1", code: "en" },
    key: { id: "key-sample-1", name: "home.title" },
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
  },
});
