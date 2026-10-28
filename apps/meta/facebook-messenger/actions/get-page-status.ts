import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, pageSegment } from "../lib/client.ts";

interface Input {
  pageId?: string;
}

interface PageStatus {
  id: string;
  timestamp: number;
  status: "warning" | "restricted" | "ok" | "suspended";
  violations?: unknown[];
  restrictions?: unknown[];
  recommended_actions?: unknown[];
}

/**
 * Integrity and messaging status of the Page — `GET /{page}/page_status` (Page Status API;
 * needs `pages_manage_metadata`). A `restrictions[].feature` of `page_messaging` or
 * `page_messaging_api` explains a Page that suddenly cannot send.
 */
const getPageStatus: ActionDefinition<Input, PageStatus> = {
  key: "get-page-status",
  type: "read",
  resource: "page",
  title: "Get Page Status",
  description: "Read the Page's integrity status, violations and messaging restrictions.",
  params: [{ key: "pageId", label: "Page ID", type: "string", hint: "Defaults to `me`." }],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "status", type: "string", label: "Status (ok, warning, restricted, suspended)" },
    { key: "violations", type: "array", label: "Violations" },
    { key: "restrictions", type: "array", label: "Restrictions" },
    { key: "recommended_actions", type: "array", label: "Recommended actions" },
  ],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<PageStatus>(
      `/${pageSegment(input.pageId)}/page_status`,
    );
  },
};

export default getPageStatus;
