import type { ActionDefinition } from "@w6w/types";
import { compact, FortnoxClient, jsonObject, seg } from "../lib/client.ts";

interface Input {
  number: string;
  description?: string;
  active?: boolean;
  sru?: number;
  costCenterSettings?: string;
  projectSettings?: string;
  vatCode?: string;
  additionalFields?: unknown;
  financialYear?: string;
}

const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description:
    "Update a ledger account. Only the properties sent are changed; the number itself cannot be changed.",
  idempotent: true,
  params: [
    {
      "key": "number",
      "label": "Account number",
      "type": "string",
      "required": true,
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "sru",
      "label": "SRU code",
      "type": "number",
    },
    {
      "key": "costCenterSettings",
      "label": "Cost center setting",
      "type": "select",
      "options": [
        {
          "value": "ALLOWED",
          "label": "ALLOWED",
        },
        {
          "value": "MANDATORY",
          "label": "MANDATORY",
        },
        {
          "value": "NOTALLOWED",
          "label": "NOTALLOWED",
        },
      ],
    },
    {
      "key": "projectSettings",
      "label": "Project setting",
      "type": "select",
      "options": [
        {
          "value": "ALLOWED",
          "label": "ALLOWED",
        },
        {
          "value": "MANDATORY",
          "label": "MANDATORY",
        },
        {
          "value": "NOTALLOWED",
          "label": "NOTALLOWED",
        },
      ],
    },
    {
      "key": "vatCode",
      "label": "VAT code",
      "type": "string",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        'Any other Fortnox field of this record, by its API name, merged into the payload last (e.g. {"Comments": "..."}). Send an empty string to clear a value.',
    },
    {
      "key": "financialYear",
      "label": "Financial year id",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "Account",
      "type": "object",
      "label": "Update Account result",
    },
  ],

  execute(input, ctx) {
    const payload = {
      Description: input.description,
      Active: input.active,
      SRU: input.sru,
      CostCenterSettings: input.costCenterSettings,
      ProjectSettings: input.projectSettings,
      VATCode: input.vatCode,
    };
    return new FortnoxClient(ctx).put(
      `/3/accounts/${seg(input.number)}`,
      {
        Account: { ...compact(payload), ...jsonObject(input.additionalFields, "additionalFields") },
      },
      { financialyear: input.financialYear },
    );
  },
};

export default accountUpdate;
