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

const questionLinkedList: ActionDefinition<Input> = {
  key: "question-linked-list",
  type: "read",
  resource: "question",
  title: "List Linked Questions",
  description: "Questions that link to the given questions.",
  params: [
    siteParam,
    idsParam(
      "questionIds",
      "Question IDs",
      "One or more question IDs, comma- or semicolon-separated (max 100).",
    ),
    pageParam,
    pageSizeParam,
    sortParam(["activity", "creation", "votes", "rank"], "activity"),
    orderParam,
    minParam,
    maxParam,
    fromDateParam,
    toDateParam,
    filterParam,
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const body = await new StackExchangeClient(ctx).get(
      `/questions/${idList(input.questionIds)}/linked`,
      {
        ...commonQuery(input),
      },
    );
    return wrapperResult(body);
  },
};

export default questionLinkedList;
