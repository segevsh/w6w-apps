import { snapshotTrigger } from "../lib/polls.ts";
import listDefaultQuestions from "../actions/list-default-questions.ts";
import { QUESTION_LIST_ITEM_OUTPUT, QUESTION_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for registration questions. The event's default (canned) questions
 * (`GET /events/{id}/canned_questions/`, read by `list-default-questions` with `include_all=false`
 * so it is the event's own selection, not Eventbrite's whole catalog; the vendor reference marks
 * `include_all` required) are compared check to check.
 * https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newDefaultQuestion = snapshotTrigger({
  key: "new-default-question",
  title: "New Default Question",
  description:
    "Checks an event's default registration questions on a schedule. The run gets each question added since the previous check: its text, type and choices.",
  action: listDefaultQuestions,
  list: "questions",
  paged: true,
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    required: true,
    hint: "The event to watch.",
  }],
  input: (p) => ({ eventId: String(p.eventId ?? "").trim(), includeAll: false }),
  output: QUESTION_LIST_ITEM_OUTPUT,
  sample: QUESTION_SAMPLE,
});

export default newDefaultQuestion;
