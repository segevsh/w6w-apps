import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  audioUri: string;
  targetLang: string;
  disableVoiceCloning?: boolean;
  dropBackgroundAudio?: boolean;
  numSpeakers?: number;
}

/** `POST /v1/voice_dubbing` — `targetLang` is one of the vendor's 29 language codes. */
export default generationAction<Input>({
  key: "voice-dubbing",
  title: "Voice Dubbing",
  description: "Dub the speech in an audio file into another language.",
  path: "/v1/voice_dubbing",
  params: [
    modelParam("The dubbing model id.", "eleven_voice_dubbing"),
    { key: "audioUri", label: "Audio URI", type: "string", required: true },
    {
      key: "targetLang",
      label: "Target language",
      type: "string",
      required: true,
      hint: "A language code such as es, fr, de, ja, pt, zh, hi, ar.",
    },
    { key: "disableVoiceCloning", label: "Disable voice cloning", type: "boolean" },
    { key: "dropBackgroundAudio", label: "Drop background audio", type: "boolean" },
    {
      key: "numSpeakers",
      label: "Number of speakers",
      type: "number",
      validation: { min: 0, integer: true },
    },
  ],
  build: (i) => ({
    audioUri: i.audioUri,
    targetLang: i.targetLang,
    disableVoiceCloning: i.disableVoiceCloning,
    dropBackgroundAudio: i.dropBackgroundAudio,
    numSpeakers: i.numSpeakers,
  }),
});
