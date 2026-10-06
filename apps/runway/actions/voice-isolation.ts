import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  audioUri: string;
}

/** `POST /v1/voice_isolation` — one model today, `eleven_voice_isolation`. */
export default generationAction<Input>({
  key: "voice-isolation",
  title: "Voice Isolation",
  description: "Isolate the voice in an audio file from background sound.",
  path: "/v1/voice_isolation",
  params: [
    modelParam("The isolation model id.", "eleven_voice_isolation"),
    { key: "audioUri", label: "Audio URI", type: "string", required: true },
  ],
  build: (i) => ({ audioUri: i.audioUri }),
});
