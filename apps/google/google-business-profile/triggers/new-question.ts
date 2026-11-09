import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listQuestions from "../actions/list-questions.ts";

type Params = { locationId: string; ignoreAnswered?: boolean };

function questionId(item: unknown): string {
  const name = (item as { name?: unknown }).name;
  if (typeof name !== "string" || name === "") {
    throw new Error("Google Business Profile question has no name");
  }
  return name;
}

const newQuestion = pollFromListAction<Params>({
  key: "new-question",
  title: "New Question",
  description:
    "Polls a Business Profile location for new questions. The run gets the new question.",
  action: listQuestions as unknown as ActionDefinition,
  input: (params) => ({
    locationId: params.locationId,
    ignoreAnswered: params.ignoreAnswered ?? false,
    pageSize: 10,
    orderBy: "updateTime desc",
  }),
  items: (result) => (result as { questions?: unknown[] }).questions ?? [],
  idOf: questionId,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "ignoreAnswered",
      label: "Only unanswered questions",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "name", label: "Question name", type: "string" },
    { key: "text", label: "Question", type: "string" },
    { key: "updateTime", label: "Updated time", type: "string" },
  ],
  sample: {
    name: "locations/123/questions/456",
    text: "Do you offer delivery?",
    updateTime: "2026-11-09T12:00:00Z",
  },
});

export default newQuestion;
