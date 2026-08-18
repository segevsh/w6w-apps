import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/requests/{request_id}` — what happened to one request.
 *
 * The other half of a callback. `audio-transcribe` with a callback URL returns
 * a `request_id` and nothing else; when the callback does not arrive — the
 * receiving endpoint was down, the URL was wrong, the audio could not be
 * fetched — this is the only place that says why.
 *
 * It reports the model used, the duration billed and the response code, which
 * between them distinguish the three failures that look identical from the
 * outside: Deepgram never got the request, Deepgram could not fetch the audio,
 * or Deepgram finished and the callback failed.
 */
const action: ActionDefinition = {
  key: "request-get",
  type: "read",
  resource: "request",
  title: "Get a request",
  description:
    "What happened to one request. The only place that distinguishes 'the callback never " +
    "arrived' from 'Deepgram could not fetch the audio' from 'it never got here'.",
  params: [
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `audio-transcribe` or `speech-generate`.",
    },
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "code", type: "number", label: "The response code Deepgram returned" },
    { key: "callback", type: "object", label: "Whether the callback was delivered, and its code" },
    { key: "duration", type: "number", label: "Audio duration billed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const requestId = String(p.requestId ?? "").trim();
    if (!requestId) throw new Error("`requestId` is required");

    const client = new DeepgramClient(ctx);
    return await client.request(
      `/v1/projects/${encodeURIComponent(client.projectId)}/requests/${
        encodeURIComponent(requestId)
      }`,
    );
  },
};

export default action;
