import type { ActionDefinition } from "@w6w/types";
import { encodeId, YouformClient } from "../lib/client.ts";

interface Input {
  submission: number | string;
  enable: boolean;
}

/**
 * `POST /api/submissions/{id}/refill-link` with body `{"enable": true|false}`.
 *
 * The collection says to pass the flag "in body" and accepts true/1 or
 * false/0. The id is the numeric submission `id` from the submissions list,
 * not its `uid`. It sets a state rather than toggling, so a retry is safe.
 * The collection documents no response example; the body is returned verbatim.
 */
const submissionRefillLinkSet: ActionDefinition<Input> = {
  key: "submission-refill-link-set",
  type: "perform",
  resource: "submission",
  title: "Set submission refill link",
  description: "Enable or disable the refill link that lets a respondent edit a submission.",
  idempotent: true,
  params: [
    {
      key: "submission",
      label: "Submission ID",
      type: "number",
      required: true,
      hint: "The numeric `id` of the submission (not its `uid`).",
    },
    {
      key: "enable",
      label: "Enable refill link",
      type: "boolean",
      required: true,
      default: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "Youform's response, verbatim" }],

  execute(input, ctx) {
    return new YouformClient(ctx).json(`/submissions/${encodeId(input.submission)}/refill-link`, {
      method: "POST",
      body: { enable: input.enable === true },
    });
  },
};

export default submissionRefillLinkSet;
