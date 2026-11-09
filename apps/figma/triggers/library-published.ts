import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "library-published",
  title: "Library Published",
  description:
    "The run gets each Figma library publish, with the created, modified and deleted assets.",
  eventType: "LIBRARY_PUBLISH",
  sample: {
    eventType: "LIBRARY_PUBLISH",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Developer page mockup demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "813845097374535682", handle: "Dylan Field" },
    data: {
      description: "v2 icons",
      created_components: [],
      modified_components: [],
      deleted_components: [],
    },
  },
});
