import { webhookTrigger } from "../lib/triggers.ts";

/** A respondent finishes a survey. */
const responseCompleted = webhookTrigger({
  key: "response-completed",
  title: "Response Completed",
  description:
    "Fires when someone completes a SurveyMonkey survey. The run gets the response with every page, question and answer.",
});

export default responseCompleted;
