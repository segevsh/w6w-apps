import type { ActionDefinition } from "@w6w/types";
import {
  type CommonInput,
  commonQuery,
  idList,
  StackExchangeClient,
  wrapperResult,
} from "../lib/client.ts";
import {
  filterParam,
  fromDateParam,
  idsParam,
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
  questionIds: string | string[];
}

const questionGet: ActionDefinition<Input> = {
  key: "question-get",
  type: "read",
  resource: "question",
  title: "Get Questions",
  description:
    "Fetch questions by ID (up to 100 at once). Pass Filter `withbody` for the body text.",
  params: [
    siteParam,
    idsParam(
      "questionIds",
      "Question IDs",
      "One or more question IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(`/questions/${idList(input.questionIds)}`, {
      ...commonQuery(input),
    });
    return wrapperResult(body);
  },
};

export default questionGet;
