import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  StackExchangeClient,
  tagList,
  wrapperResult,
} from "../lib/client.ts";
import {
  filterParam,
  fromDateParam,
  LIST_OUTPUT,
  maxParam,
  minParam,
  orderParam,
  pageParam,
  pageSizeParam,
  siteParam,
  sortParam,
  toDateParam,
} from "../lib/params.ts";

interface Input extends CommonInput {
  q?: string;
  accepted?: string;
  answers?: number;
  body?: string;
  closed?: string;
  migrated?: string;
  notice?: string;
  nottagged?: string;
  tagged?: string;
  title?: string;
  user?: number;
  url?: string;
  views?: number;
  wiki?: string;
}

const searchAdvanced: ActionDefinition<Input> = {
  key: "search-advanced",
  type: "read",
  resource: "question",
  title: "Search Questions (Advanced)",
  description:
    "Search questions with the full criteria set: text, body/title/URL, tags, author, answered/closed state, minimum views and answers.",
  params: [
    siteParam,
    {
      key: "q",
      label: "Query",
      type: "string",
      hint: "Free-form text matched against all question properties.",
    },
    {
      key: "accepted",
      label: "Has accepted answer",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Omit for no constraint.",
    },
    {
      key: "answers",
      label: "Min answers",
      type: "number",
    },
    {
      key: "body",
      label: "Body contains",
      type: "string",
    },
    {
      key: "closed",
      label: "Closed",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Omit for no constraint.",
    },
    {
      key: "migrated",
      label: "Migrated",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Omit for no constraint.",
    },
    {
      key: "notice",
      label: "Has post notice",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Omit for no constraint.",
    },
    {
      key: "nottagged",
      label: "Excluded tags",
      type: "string",
      hint: "Semicolon- or comma-separated tags none of which may be present.",
    },
    {
      key: "tagged",
      label: "Tags",
      type: "string",
      hint: "Semicolon- or comma-separated tags.",
    },
    {
      key: "title",
      label: "Title contains",
      type: "string",
    },
    {
      key: "user",
      label: "Author user ID",
      type: "number",
    },
    {
      key: "url",
      label: "URL contained",
      type: "string",
      hint: "May include a wildcard.",
    },
    {
      key: "views",
      label: "Min views",
      type: "number",
    },
    {
      key: "wiki",
      label: "Community wiki",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Omit for no constraint.",
    },
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes", "relevance"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/search/advanced`, {
      ...commonQuery(input),
      q: input.q,
      accepted: input.accepted,
      answers: input.answers,
      body: input.body,
      closed: input.closed,
      migrated: input.migrated,
      notice: input.notice,
      nottagged: tagList(input.nottagged),
      tagged: tagList(input.tagged),
      title: input.title,
      user: input.user,
      url: input.url,
      views: input.views,
      wiki: input.wiki,
    });
    return wrapperResult(body);
  },
};

export default searchAdvanced;
