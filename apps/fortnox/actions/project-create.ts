import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject } from "../lib/client.ts";

interface Input {
  description: string;
  projectNumber?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  projectLeader?: string;
  contactPerson?: string;
  comments?: string;
  additionalFields?: unknown;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project. Only the description is required.",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Description",
      "type": "string",
      "required": true,
    },
    {
      "key": "projectNumber",
      "label": "Project number",
      "type": "string",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "NOTSTARTED",
          "label": "NOTSTARTED",
        },
        {
          "value": "ONGOING",
          "label": "ONGOING",
        },
        {
          "value": "COMPLETED",
          "label": "COMPLETED",
        },
      ],
    },
    {
      "key": "startDate",
      "label": "Start date",
      "type": "string",
    },
    {
      "key": "endDate",
      "label": "End date",
      "type": "string",
    },
    {
      "key": "projectLeader",
      "label": "Project leader",
      "type": "string",
    },
    {
      "key": "contactPerson",
      "label": "Contact person",
      "type": "string",
    },
    {
      "key": "comments",
      "label": "Comments",
      "type": "string",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
  ],
  output: [
    {
      "key": "Project",
      "type": "object",
      "label": "Create Project result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      Description: input.description,
      ProjectNumber: input.projectNumber,
      Status: input.status,
      StartDate: input.startDate,
      EndDate: input.endDate,
      ProjectLeader: input.projectLeader,
      ContactPerson: input.contactPerson,
      Comments: input.comments,
    };
    return new FortnoxClient(ctx).post(
      "/3/projects",
      {
        Project: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") },
      },
    );
  },
};

export default projectCreate;
