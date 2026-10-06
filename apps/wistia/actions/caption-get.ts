import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { mediaIdParam } from "../lib/params.ts";

interface Input {
  mediaId: string;
  languageCode: string;
  include?: string;
}

const captionGet: ActionDefinition<Input> = {
  key: "caption-get",
  type: "read",
  resource: "caption",
  title: "Get Captions",
  description:
    "Fetch a media's captions in one language as JSON, with the full transcript text and " +
    "optionally time-coded or speaker-turn segments. SRT, VTT and TXT downloads are not covered.",
  params: [
    mediaIdParam,
    {
      key: "languageCode",
      label: "Language code",
      type: "string",
      required: true,
      hint: "3-character ISO 639-2 code such as eng, fra or spa; some use IETF subtags (zh-Hant).",
    },
    {
      key: "include",
      label: "Include",
      type: "select",
      options: [
        { value: "segments", label: "Time-coded caption cues" },
        { value: "diarized_segments", label: "Speaker-turn segments" },
      ],
    },
  ],
  output: [
    { key: "language", type: "string", label: "Language code" },
    { key: "text", type: "string", label: "Transcript text" },
    { key: "is_draft", type: "boolean", label: "Draft" },
    { key: "segments", type: "array", label: "Time-coded cues (when requested)" },
  ],

  execute(input, ctx) {
    if (!input.languageCode?.trim()) throw new Error("languageCode is required");
    return new WistiaClient(ctx).json(
      `/medias/${encodeId(input.mediaId)}/captions/${encodeId(input.languageCode)}`,
      { query: { include: input.include } },
    );
  },
};

export default captionGet;
