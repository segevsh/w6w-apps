import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/addactivity.json` — Record a custom activity on a contact's timeline.
 */
interface Input {
  id: string;
  description: string;
  datetime: string;
}

const activityAdd: ActionDefinition<Input> = {
  key: "activity-add",
  type: "perform",
  resource: "contact",
  title: "Add Contact Activity",
  description: "Record a custom activity on a contact's timeline.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
    },
    {
      key: "datetime",
      label: "Date and Time",
      type: "string",
      required: true,
      hint: "When the activity happened, e.g. 2026-10-06 14:30.",
    },
  ],
  output: [
    {
      key: "ok",
      type: "boolean",
      label:
        "True when VBOUT accepted the request. Any fields VBOUT returns for the record (e.g. a created record's details) are merged in.",
    },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).post("emailmarketing/addactivity", {
      id: input.id,
      description: input.description,
      datetime: input.datetime,
    });
  },
};

export default activityAdd;
