import type { ActionDefinition } from "@w6w/types";
import { GoCanvasClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
}

const siteList: ActionDefinition<Input> = {
  key: "site-list",
  type: "read",
  resource: "site",
  title: "List Sites",
  description: "List the company's sites (Project Management View only).",
  params: [
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Sites on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list("/sites", { page: input.page });
  },
};

export default siteList;
