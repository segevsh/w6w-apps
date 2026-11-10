import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import pullRequestList from "../actions/pull-request-list.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-or-updated-pull-request",
  title: "New or Updated Pull Request",
  description:
    "The run gets each pull request in the chosen repository that is new or has been updated, once per update.",
  action: pullRequestList as unknown as ActionDefinition,
  params: [REPO_PARAM, OWNER_PARAM],
  input: (params) => ({
    ...(params as Record<string, unknown>),
    state: "all",
    sort: "recentupdate",
    limit: 50,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "") + ":" + String(i.updated_at ?? "");
  },
  output: [
    { key: "id", type: "number", label: "Pull request ID" },
    { key: "number", type: "number", label: "Number" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 9001,
    number: 12,
    title: "Add retries",
    state: "open",
    html_url: "https://git.example.test/acme/api/pulls/12",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
