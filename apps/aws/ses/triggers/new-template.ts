import templateList from "../actions/template-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-template",
  title: "New Email Template",
  description: "The run gets each newly created email template in the connection's region.",
  output: [
    { key: "templateName", type: "string", label: "Template name" },
    { key: "createdTimestamp", type: "string", label: "Created" },
  ],
  sample: { templateName: "welcome", createdTimestamp: "2026-11-09T10:00:00.000Z" },
  async list(ctx, pageSize, nextToken) {
    const res = await templateList.execute({ pageSize, nextToken }, ctx) as {
      templates?: unknown[];
      nextToken?: string;
    };
    return { items: res.templates ?? [], nextToken: res.nextToken };
  },
  keyOf: (item) => String((item as { templateName?: unknown }).templateName ?? ""),
});
