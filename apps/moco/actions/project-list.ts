import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";
import { pagination, parseList, updatedAfter } from "../lib/params.ts";

interface Input {
  term?: string;
  companyId?: string;
  leaderId?: string;
  identifier?: string;
  ids?: string;
  tags?: string[] | string;
  includeArchived?: boolean;
  page?: number;
  perPage?: number;
  updatedAfter?: string;
}

/**
 * `GET /projects` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Returns projects
 * visible to the current user, with nested customer, task, contract and leadership data.
 */
const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects. Use the filters to narrow the set.",
  params: [
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Searches project name, identifier and customer company name.",
    },
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      hint: "Single ID or comma-separated.",
    },
    { key: "leaderId", label: "Leader (user) ID", type: "string", advanced: true },
    { key: "identifier", label: "Identifier", type: "string", advanced: true },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated project IDs.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
    { key: "includeArchived", label: "Include archived", type: "boolean", advanced: true },
    updatedAfter,
    ...pagination,
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Entries per page" },
    { key: "total", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const { items, page } = await new MocoClient(ctx).list("/projects", {
      query: {
        term: input.term,
        company_id: input.companyId,
        leader_id: input.leaderId,
        identifier: input.identifier,
        ids: input.ids,
        tags: parseList(input.tags)?.join(","),
        include_archived: input.includeArchived,
        updated_after: input.updatedAfter,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { projects: items, page: page.page, perPage: page.perPage, total: page.total };
  },
};

export default projectList;
