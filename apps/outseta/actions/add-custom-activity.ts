import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient } from "../lib/client.ts";

interface Input {
  entityType: string | number;
  entityUid: string;
  title: string;
  description?: string;
  activityData?: string;
  activityDateTime?: string;
}

/** `POST /api/v1/activities/customactivity` — Record a custom event on an account, person or deal. The title can trigger drip-campaign automation. */
const addCustomActivity: ActionDefinition<Input> = {
  key: "add-custom-activity",
  type: "perform",
  resource: "activity",
  title: "Add Custom Activity",
  description:
    "Record a custom event on an account, person or deal. The title can trigger drip-campaign automation.",
  idempotent: false,
  params: [
    {
      key: "entityType",
      label: "Entity type",
      type: "select",
      required: true,
      options: [
        {
          value: 1,
          label: "Account",
        },
        {
          value: 2,
          label: "Person",
        },
        {
          value: 3,
          label: "Deal",
        },
      ],
    },
    {
      key: "entityUid",
      label: "Entity Uid",
      type: "string",
      hint: "The account, person or deal's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "To drive a drip campaign this must match the campaign's start/stop activity title.",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "activityData",
      label: "Activity data",
      type: "text",
    },
    {
      key: "activityDateTime",
      label: "Activity time",
      type: "datetime",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/activities/customactivity`, {
      method: "POST",
      body: {
        Title: input.title,
        Description: input.description,
        ActivityData: input.activityData,
        ActivityDateTime: input.activityDateTime,
        ActivityType: 10,
        EntityType: input.entityType,
        EntityUid: input.entityUid,
      },
    });
  },
};

export default addCustomActivity;
