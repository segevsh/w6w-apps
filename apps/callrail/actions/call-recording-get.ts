import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/calls/{call_id}/recording.json` — a link to the
 * call's MP3 recording.
 *
 * ## Two different response shapes for the same call
 *
 * For most accounts this returns a long-lived CallRail redirect URL. For
 * **HIPAA accounts**, the reference documents a different response: a
 * temporary URL (an S3 link) that expires in about 24 hours, with an explicit
 * warning — "You should never store the URL returned in this response...
 * because the underlying file may move in the future, the permanent
 * reference to this recording is this API endpoint itself." Both shapes
 * answer the same `{"url": "..."}` field, so this action returns it
 * unmodified either way; a caller in a HIPAA account should re-invoke this
 * action rather than cache the result.
 */
interface Input {
  accountId: string;
  callId: string;
}

const callRecordingGet: ActionDefinition<Input> = {
  key: "call-recording-get",
  type: "read",
  resource: "call",
  title: "Get Call Recording URL",
  description: "Get a link to a call's MP3 recording. For HIPAA accounts the URL is " +
    "temporary (about 24 hours) — re-invoke this action rather than caching it.",
  params: [
    accountIdParam,
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Calls or Get Call result.",
    },
  ],
  output: [{ key: "url", type: "string", label: "Recording URL" }],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/calls/${encodeId(input.callId)}/recording.json`,
    );
  },
};

export default callRecordingGet;
