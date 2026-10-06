import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import {
  AUTORESPONSE_PARAM,
  BACKGROUND_PARAM,
  helperBody,
  PERSON_PARAMS,
  recordOutput,
  REFERRER_PARAMS,
  TAG_OP_PARAMS,
} from "../lib/person.ts";

/** Record Submission Helper: `POST /forms/{id}/submissions` with an inline person. */
const submissionRecord: ActionDefinition<Input> = {
  key: "submission-record",
  type: "perform",
  resource: "submission",
  title: "Record Form Submission",
  description:
    "Record that a person submitted a form, creating or updating the person in the same call. Use tags and custom fields to carry what they submitted; a submission has no fields of its own.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    ...PERSON_PARAMS,
    ...TAG_OP_PARAMS,
    ...REFERRER_PARAMS,
    AUTORESPONSE_PARAM,
    BACKGROUND_PARAM,
  ],
  output: recordOutput({ key: "action_network:form_id", type: "string", label: "The form's id" }),

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).create(
      `/forms/${seg(need(input, "formId"))}/submissions`,
      helperBody(input, {}, { autoresponse: true }),
      input.backgroundRequest === true,
    );
  },
};

export default submissionRecord;
