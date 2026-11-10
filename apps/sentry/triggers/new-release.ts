import { pollFromListAction } from "../../_shared/poll/mod.ts";
import releaseList from "../actions/release-list.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/releases/` returns releases "sorted by most recent"
 * (https://docs.sentry.io/api/releases/list-an-organizations-releases/, verified 2026-11-10);
 * a release is identified by its `version`.
 */
export default pollFromListAction({
  key: "new-release",
  title: "New Release",
  description: "The run gets each release newly recorded in a Sentry organization.",
  action: releaseList,
  params: [ORG_PARAM],
  input: (params: { organizationSlug?: string }) => ({
    organizationSlug: params.organizationSlug,
    limit: 100,
    returnAll: false,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { version?: unknown }).version ?? ""),
  output: [
    { key: "version", type: "string", label: "Version" },
    { key: "shortVersion", type: "string", label: "Short version" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "newGroups", type: "number", label: "New issues" },
    { key: "projects", type: "array", label: "Projects" },
  ],
  sample: {
    version: "backend@1.4.0",
    shortVersion: "1.4.0",
    dateCreated: "2026-11-10T09:00:00Z",
    newGroups: 0,
    projects: [{ slug: "backend" }],
  },
  maxPages: 1,
});
