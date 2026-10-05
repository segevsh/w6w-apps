import type { ActionDefinition } from "@w6w/types";
import { jsonObject, NetSuiteClient, recordId, recordPath } from "../lib/client.ts";
import { recordIdParam, recordTypeParam } from "../lib/params.ts";

interface Input {
  recordType: string;
  id: string;
  action: string;
  parameters?: unknown;
}

/**
 * `POST /services/rest/record/v1/<type>/<id>/@<action>` — "Executing Record Actions": the
 * equivalent of clicking a button on the record (`approve`, `reject`, `confirm`…). The names are
 * those of SuiteScript's supported record actions; Oracle provides no metadata for them, so the
 * action name is free text. A successful call answers 200.
 */
const recordAction: ActionDefinition<Input> = {
  key: "record-action",
  type: "perform",
  resource: "record",
  title: "Run Record Action",
  description: "Trigger a record action such as approve, reject or confirm on a record.",
  // Whether re-running is safe depends on the action (approve twice vs. confirm twice).
  idempotent: false,
  params: [
    recordTypeParam,
    recordIdParam,
    {
      key: "action",
      label: "Action",
      type: "string",
      required: true,
      placeholder: "approve",
      validation: { pattern: "^[A-Za-z][A-Za-z0-9_]*$" },
      hint: "The record action's name without the `@` (see NetSuite's Supported Record Actions).",
    },
    {
      key: "parameters",
      label: "Action parameters",
      type: "json",
      hint: 'Optional JSON object, e.g. `{"confirmationDate":"2019-1-31","postingPeriod":348}`.',
    },
  ],
  output: [{ key: "result", type: "object", label: "Response body, if any" }],

  async execute(input, ctx) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(input.action ?? "")) {
      throw new Error("Invalid record action name — letters, digits and `_` only.");
    }
    const body = jsonObject(input.parameters, "parameters");
    const client = new NetSuiteClient(ctx);
    const path = `${recordPath(input.recordType, recordId(input.id))}/@${input.action}`;
    const res = await client.request(path, {
      method: "POST",
      body: Object.keys(body).length > 0 ? body : undefined,
    });
    return { result: res.data };
  },
};

export default recordAction;
