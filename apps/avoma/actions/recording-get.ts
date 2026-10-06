import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/**
 * `GET /v1/recordings/?meeting_uuid=` — signed audio and video URLs for a meeting.
 *
 * Two successes: 200 carries the URLs; 202 means the recording is still being prepared and
 * carries only `{meeting_uuid, message, uuid}` — so `audio_url` / `video_url` may be absent
 * and a workflow should branch on their presence. `valid_till` is when the URLs expire.
 * 403 / 404 / 429 are errors.
 */
interface Input {
  meetingUuid: string;
}

const recordingGet: ActionDefinition<Input> = {
  key: "recording-get",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Get expiring audio and video download URLs for a meeting's recording. If it is " +
    "still processing, the URLs are absent and a message says so.",
  params: [{ key: "meetingUuid", label: "Meeting UUID", type: "string", required: true }],
  output: [
    { key: "uuid", type: "string", label: "Recording UUID" },
    { key: "meeting_uuid", type: "string", label: "Meeting UUID" },
    { key: "audio_url", type: "string", label: "Audio URL (absent while processing)" },
    { key: "video_url", type: "string", label: "Video URL (absent while processing)" },
    { key: "valid_till", type: "string", label: "URLs valid until" },
    { key: "message", type: "string", label: "Message (set while processing)" },
  ],

  execute(input, ctx) {
    seg(input.meetingUuid, "meetingUuid");
    return new AvomaClient(ctx).get("/v1/recordings/", { meeting_uuid: input.meetingUuid.trim() });
  },
};

export default recordingGet;
