import { webhookTrigger } from "../lib/triggers.ts";

/** A new entry is submitted (the form's Submit Entry Endpoint). */
const entrySubmitted = webhookTrigger({
  key: "entry-submitted",
  title: "New Entry",
  description:
    "Fires when someone submits a Cognito Forms entry to a form whose Submit Entry Endpoint is this trigger's URL. The run gets the entry's id and its full field data as the form's JSON.",
  event: "entry.submitted",
  sample: {
    event: "entry.submitted",
    entryId: "42",
    formId: "7",
    entry: {
      Id: "7-42",
      Form: { Id: "7", Name: "Contact Us" },
      Entry: { Id: "7-42", Number: 42 },
      Name: { First: "Ada", Last: "Lovelace" },
      Email: "ada@example.com",
    },
  },
});

export default entrySubmitted;
