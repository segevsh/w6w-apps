import type { ActionDefinition } from "@w6w/types";
import { listResult, MightyClient, seg } from "../lib/client.ts";

/** `GET /spaces/{space_id}/courseworks` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  spaceId: number;
  type?: string;
  parentId?: number;
  status?: string;
  page?: number;
  perPage?: number;
}

const courseworkList: ActionDefinition<Input> = {
  key: "coursework-list",
  type: "search",
  resource: "coursework",
  title: "List Coursework",
  description: "List the lessons, quizzes and sections of a course (a space), one page at a time.",
  params: [
    {
      key: "spaceId",
      label: "Course (space) ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "lesson", label: "Lesson" }, { value: "quiz", label: "Quiz" }, {
        value: "section",
        label: "Section",
      }, { value: "overview", label: "Overview" }],
    },
    {
      key: "parentId",
      label: "Parent ID",
      type: "number",
      hint: "Only children of this coursework item.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "posted", label: "Posted" }, { value: "hidden", label: "Hidden" }, {
        value: "pending",
        label: "Pending",
      }],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Defaults to 1.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Items per page, max 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label:
        "The page of records, when the response carries them as an array under `items`/`data` (null otherwise)",
    },
    { key: "result", type: "object", label: "The full response body, unmodified" },
  ],

  async execute(input, ctx) {
    return listResult(
      await new MightyClient(ctx).request(`/spaces/${seg(input.spaceId)}/courseworks`, {
        query: {
          type: input.type,
          parent_id: input.parentId,
          status: input.status,
          page: input.page,
          per_page: input.perPage,
        },
      }),
    );
  },
};

export default courseworkList;
