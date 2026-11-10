import { webhookTrigger } from "../lib/triggers.ts";

/** An entry is deleted (the form's Delete Entry Endpoint). */
const entryDeleted = webhookTrigger({
  key: "entry-deleted",
  title: "Deleted Entry",
  description:
    "Fires when a Cognito Forms entry is deleted on a form whose Delete Entry Endpoint is this trigger's URL. The run gets the entry's id and its field data, without entry links or file and document links.",
  event: "entry.deleted",
  sample: {
    event: "entry.deleted",
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

export default entryDeleted;
