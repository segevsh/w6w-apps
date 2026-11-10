import { webhookTrigger } from "../lib/triggers.ts";

/** An entry is updated (the form's Update Entry Endpoint). */
const entryUpdated = webhookTrigger({
  key: "entry-updated",
  title: "Updated Entry",
  description:
    "Fires when a Cognito Forms entry is updated (not while it is Incomplete) on a form whose Update Entry Endpoint is this trigger's URL. The run gets the entry's id and its full field data as the form's JSON.",
  event: "entry.updated",
  sample: {
    event: "entry.updated",
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

export default entryUpdated;
