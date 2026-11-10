import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "file-version-created",
  title: "File Version Created",
  description: "The run gets each named version added to a Figma file's version history.",
  eventType: "FILE_VERSION_UPDATE",
  sample: {
    eventType: "FILE_VERSION_UPDATE",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Developer page mockup demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "813845097374535682", handle: "Dylan Field" },
    data: {
      created_at: "2026-11-09T12:00:00Z",
      version_id: "443",
      label: "Added new documentation!",
      description: "Wrote new docs",
    },
  },
});
