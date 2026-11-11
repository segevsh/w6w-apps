import type { ActionDefinition } from "@w6w/types";
import imageTemplateList from "../actions/image-template-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-image-template",
  title: "New Image Template",
  description:
    "The run gets each newly created image template, polled newest-first through image-template-list.",
  action: imageTemplateList as unknown as ActionDefinition,
  sample: { uid: "tmpl_001", name: "Social card", created_at: "2026-11-09T10:00:00.000Z" },
});
