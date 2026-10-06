import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  promptText: string;
  duration?: number;
  loop?: boolean;
  outputFormat?: string;
}

/** `POST /v1/sound_effect` — models `eleven_text_to_sound_v2` and `seed_audio`. */
export default generationAction<Input>({
  key: "sound-effect",
  title: "Generate Sound Effect",
  description: "Start a sound effect generation from a text description.",
  path: "/v1/sound_effect",
  params: [
    modelParam("eleven_text_to_sound_v2 or seed_audio.", "eleven_text_to_sound_v2"),
    { key: "promptText", label: "Description", type: "text", required: true },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 0.5, max: 30 },
    },
    { key: "loop", label: "Loop", type: "boolean" },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: ["wav", "mp3", "ogg_opus"].map((v) => ({ value: v, label: v })),
    },
  ],
  build: (i) => ({
    promptText: i.promptText,
    duration: i.duration,
    loop: i.loop,
    outputFormat: i.outputFormat,
  }),
});
