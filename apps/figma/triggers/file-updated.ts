import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "file-updated",
  title: "File Updated",
  description: "The run gets each Figma file edit, after 30 minutes of editing inactivity.",
  eventType: "FILE_UPDATE",
  sample: {
    eventType: "FILE_UPDATE",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Developer page mockup demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "813845097374535682", handle: "Dylan Field" },
    data: {},
  },
});
