import { snapshotTrigger } from "../lib/polls.ts";
import listCustomQuestions from "../actions/list-custom-questions.ts";
import { QUESTION_LIST_ITEM_OUTPUT, QUESTION_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for registration questions, and an event has a bounded number of
 * them, so the whole list (`GET /events/{id}/questions/`, read by `list-custom-questions`) is
 * compared check to check. https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newCustomQuestion = snapshotTrigger({
  key: "new-custom-question",
  title: "New Custom Question",
  description:
    "Checks an event's custom registration questions on a schedule. The run gets each question added since the previous check: its text, type and choices.",
  action: listCustomQuestions,
  list: "questions",
  paged: true,
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    required: true,
    hint: "The event to watch.",
  }],
  input: (p) => ({ eventId: String(p.eventId ?? "").trim() }),
  output: QUESTION_LIST_ITEM_OUTPUT,
  sample: QUESTION_SAMPLE,
});

export default newCustomQuestion;
