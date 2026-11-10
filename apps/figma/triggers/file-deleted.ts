import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "file-deleted",
  title: "File Deleted",
  description: "The run gets each Figma file that is deleted.",
  eventType: "FILE_DELETE",
  sample: {
    eventType: "FILE_DELETE",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Developer page mockup demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "813845097374535682", handle: "Dylan Field" },
    data: {},
  },
});
