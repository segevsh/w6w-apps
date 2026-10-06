import type { ActionDefinition } from "@w6w/types";
import { jsonObject, RecallClient, seg } from "../lib/client.ts";
import { idParam, TRANSCRIPT_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
  provider: string;
  providerOptions?: unknown;
  separateStreams?: boolean;
  metadata?: unknown;
}

/** The async providers `POST /recording/{id}/create_transcript/` accepts (its `provider` keys). */
const PROVIDERS = [
  "recallai_async",
  "assembly_ai_async",
  "deepgram_async",
  "gladia_v2_async",
  "rev_async",
  "speechmatics_async",
  "google_speech_v2_async",
  "aws_transcribe_async",
  "elevenlabs_async",
];

/**
 * `POST /api/v1/recording/{id}/create_transcript/` — async transcription of a finished recording.
 * Rate limit: 5 requests per minute per bot. Returns the new transcript in `processing`; read it
 * with Get Transcript until `status.code` is `done`.
 */
const recordingCreateTranscript: ActionDefinition<Input> = {
  key: "recording-create-transcript",
  type: "perform",
  resource: "transcript",
  title: "Create Async Transcript",
  description:
    "Transcribe a finished recording with an asynchronous provider. Returns a transcript in `processing`; fetch it again until its status is `done`.",
  idempotent: false,
  params: [
    idParam("Recording ID"),
    {
      key: "provider",
      label: "Provider",
      type: "select",
      required: true,
      default: "recallai_async",
      options: PROVIDERS.map((value) => ({ value, label: value })),
    },
    {
      key: "providerOptions",
      label: "Provider options",
      type: "json",
      hint:
        'The provider\'s own settings object, e.g. {"language_code":"en"} for recallai_async. Defaults to {}.',
    },
    {
      key: "separateStreams",
      label: "Diarize with separate streams",
      type: "boolean",
      hint: "`diarization.use_separate_streams_when_available`.",
    },
    { key: "metadata", label: "Metadata", type: "json" },
  ],
  output: TRANSCRIPT_OUTPUT,

  execute(input, ctx) {
    const metadata = jsonObject(input.metadata);
    return new RecallClient(ctx).request(
      "POST",
      `/api/v1/recording/${seg(input.id)}/create_transcript/`,
      {
        body: {
          provider: { [input.provider]: jsonObject(input.providerOptions) ?? {} },
          ...(input.separateStreams === undefined
            ? {}
            : { diarization: { use_separate_streams_when_available: input.separateStreams } }),
          ...(metadata ? { metadata } : {}),
        },
        idempotent: true,
      },
    );
  },
};

export default recordingCreateTranscript;
