import { webhookTrigger } from "../lib/triggers.ts";

/** A respondent submits a response to the chosen form. */
const newResponse = webhookTrigger({
  key: "new-response",
  title: "New Response",
  description:
    "Fires when someone submits a response to a Typeform form. The run gets the response token, submission time, hidden fields and every answer.",
});

export default newResponse;
