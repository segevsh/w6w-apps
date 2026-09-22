import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadSortParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v1.0/leads` — search the team's leads.
 *
 * Returns a page plus a `get_metadata` envelope (`offset`, `limit`, `total`,
 * `collection`). The filter set is wide, so the important shape is what a
 * caller filters *on*: contact details (`phone`, `email`, or the loose `key`
 * search across name, phone and email), ownership (`assignedUserId`), the
 * pipeline (`stage`), vocabulary (`segments`, `allTags`, `anyTags`, `source`)
 * and whether the lead has been reached (`contacted`).
 *
 * ## What is deliberately not here
 *
 * `groups` is documented as deprecated in favour of `segments`, and
 * `otherFilters` / `returnFields` are published with no description of what
 * they accept. None of the three is exposed rather than guessed at; a future
 * revision can add them once their shape is confirmed. `roleAssigneeFilters`
 * *is* exposed — the spec gives it a worked example — as a `json` field.
 *
 * ## Paging
 *
 * `offset`/`limit` page through a snapshot; `scrollId` continues a server-side
 * cursor instead, and is echoed back in `get_metadata` for the next call.
 * `limit` is capped at 100 by the API.
 */
interface Input {
  stage?: string;
  source?: string;
  phone?: string;
  email?: string;
  assignedUserId?: number;
  contacted?: boolean;
  segments?: string;
  allTags?: string;
  anyTags?: string;
  groupIds?: string;
  querySubGroup?: boolean;
  scrollId?: string;
  sort?: string;
  desc?: boolean;
  languages?: string;
  preciseSearchFlag?: boolean;
  key?: string;
  roleAssigneeFilters?: unknown;
  limit?: number;
  offset?: number;
}

const action: ActionDefinition<Input> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description:
    "Search leads by contact details, assignee, pipeline stage, source, segments and tags " +
    "(GET /v1.0/leads).",
  params: [
    {
      key: "key",
      label: "Search",
      type: "string",
      hint: "One loose query across name, phone and email.",
    },
    {
      key: "stage",
      label: "Pipeline stage",
      type: "string",
      hint: "Exact pipeline stage name.",
    },
    { key: "source", label: "Source", type: "string" },
    { key: "phone", label: "Phone", type: "string", hint: "Precise phone-number match." },
    { key: "email", label: "Email", type: "string", hint: "Precise email match." },
    {
      key: "assignedUserId",
      label: "Assigned user ID",
      type: "number",
      hint: "Leads assigned to this agent. See List Team Members for the ids.",
    },
    {
      key: "contacted",
      label: "Contacted",
      type: "boolean",
      hint: "On: only leads that have been contacted. Off: only leads that have not.",
    },
    {
      key: "segments",
      label: "Segments",
      type: "string",
      hint: "Comma-separated segment names.",
    },
    {
      key: "allTags",
      label: "All tags",
      type: "string",
      hint: "Comma-separated names; the lead must carry every one.",
    },
    {
      key: "anyTags",
      label: "Any tags",
      type: "string",
      hint: "Comma-separated names; the lead must carry at least one.",
    },
    {
      key: "groupIds",
      label: "Office IDs",
      type: "string",
      hint: "Comma-separated office / group ids.",
    },
    {
      key: "querySubGroup",
      label: "Include sub-office leads",
      type: "boolean",
      advanced: true,
    },
    {
      key: "languages",
      label: "Languages",
      type: "string",
      advanced: true,
      hint: "Comma-separated language abbreviations.",
    },
    {
      key: "preciseSearchFlag",
      label: "Precise email/phone search",
      type: "boolean",
      advanced: true,
      hint: "Match email and phone exactly rather than loosely.",
    },
    {
      key: "roleAssigneeFilters",
      label: "Role assignee filter",
      type: "json",
      advanced: true,
      placeholder: '[{"roleName":"Agent","assigneeToIds":[111,222]}]',
      hint: "Restrict to leads assigned to specific people in a given role.",
    },
    {
      key: "scrollId",
      label: "Scroll ID",
      type: "string",
      advanced: true,
      hint: "Continue a previous search from the id it returned in `get_metadata`.",
    },
    leadSortParam,
    {
      key: "desc",
      label: "Descending",
      type: "boolean",
      advanced: true,
      hint: "Reverse the chosen sort order.",
    },
    ...paginationParams(100, "Records per page. The API's maximum is 100."),
  ],
  output: [
    { key: "get_metadata", type: "object", label: "Pagination metadata" },
    { key: "leads", type: "array", label: "Leads" },
  ],

  execute(input, ctx) {
    const roleFilters = input.roleAssigneeFilters === undefined
      ? undefined
      : typeof input.roleAssigneeFilters === "string"
      ? input.roleAssigneeFilters
      : JSON.stringify(input.roleAssigneeFilters);

    return new LoftyClient(ctx).request("/leads", {
      query: {
        stage: input.stage,
        source: input.source,
        phone: input.phone,
        email: input.email,
        assignedUserId: input.assignedUserId,
        contacted: input.contacted,
        segments: input.segments,
        allTags: input.allTags,
        anyTags: input.anyTags,
        groupIds: input.groupIds,
        querySubGroup: input.querySubGroup,
        scrollId: input.scrollId,
        offset: input.offset,
        limit: input.limit,
        sort: input.sort,
        desc: input.desc,
        languages: input.languages,
        preciseSearchFlag: input.preciseSearchFlag,
        key: input.key,
        roleAssigneeFilters: roleFilters,
      },
    });
  },
};

export default action;
