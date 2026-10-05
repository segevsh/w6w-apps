import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, mediaAuthBody } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  url: string;
  title: string;
  languageCode?: string;
  channelId?: string;
  eventGuid?: string;
  mediaAuthType?: string;
  mediaBearerToken?: string;
  mediaUsername?: string;
  mediaPassword?: string;
  onBehalfOf?: string;
}

const recordingUpload: ActionDefinition<Input> = {
  key: "recording-upload",
  type: "perform",
  resource: "recording",
  title: "Upload Recording From URL",
  description:
    "Queue a recording for import and transcription from a media URL Fellow can fetch. Returns the new recording id; poll Get Upload Status for the outcome.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Media URL",
      type: "string",
      required: true,
      hint: "A URL Fellow's servers can download the audio or video from.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
      hint: "Up to 255 characters.",
    },
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      placeholder: "en",
      hint:
        "Transcription language, one of Fellow's codes (en, en_us, en_uk, en_au, es, fr, de, pt, ja, ... de_ch). Omit to let Fellow decide.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Publish the recording to this channel.",
    },
    {
      key: "eventGuid",
      label: "Calendar event GUID",
      type: "string",
      hint: "Attach the recording to this calendar event.",
    },
    {
      key: "mediaAuthType",
      label: "Media URL authentication",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "bearer_token", label: "Bearer token" },
        { value: "basic_auth", label: "Basic auth" },
      ],
      default: "none",
      hint: "How Fellow authenticates when it downloads the media URL (not Fellow credentials).",
    },
    {
      key: "mediaBearerToken",
      label: "Media bearer token",
      type: "secret",
      showIf: { "==": [{ var: "mediaAuthType" }, "bearer_token"] },
    },
    {
      key: "mediaUsername",
      label: "Media username",
      type: "string",
      showIf: { "==": [{ var: "mediaAuthType" }, "basic_auth"] },
    },
    {
      key: "mediaPassword",
      label: "Media password",
      type: "secret",
      showIf: { "==": [{ var: "mediaAuthType" }, "basic_auth"] },
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "recording_id", type: "string", label: "Id of the queued recording" },
  ],

  execute(input, ctx) {
    const mediaAuth = mediaAuthBody(input);
    return new FellowClient(ctx).request("/recordings/upload", {
      method: "POST",
      body: compact({
        url: input.url,
        title: input.title,
        language_code: input.languageCode,
        channel_id: input.channelId,
        event_guid: input.eventGuid,
        media_auth: mediaAuth,
      }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default recordingUpload;
