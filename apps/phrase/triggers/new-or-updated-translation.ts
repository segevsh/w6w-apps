import translationList from "../actions/translation-list.ts";
import { projectIdParam, sortedTrigger } from "../lib/depth.ts";

// Same endpoint with `sort=updated_at&order=desc` (verified 2026-11-10); the id carries `updated_at`
// so an edited translation is a new event (brief 9.2).
export default sortedTrigger<{ projectId: string }>({
  key: "new-or-updated-translation",
  title: "New or Updated Translation",
  description: "The run gets each translation in the chosen project that was created or edited.",
  action: translationList as never,
  params: [projectIdParam],
  sort: { sort: "updated_at", order: "desc" },
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Translation ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "locale", type: "object", label: "Locale" },
    { key: "key", type: "object", label: "Key" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "translation-sample-1",
    content: "Welcome back",
    locale: { id: "locale-sample-1", code: "en" },
    key: { id: "key-sample-1", name: "home.title" },
    updated_at: "2026-11-10T09:30:00Z",
  },
});
