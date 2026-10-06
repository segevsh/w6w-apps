import { need } from "../lib/client.ts";
import { generationAction, modelParam, MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  characterType: string;
  characterUri: string;
  referenceUri: string;
  bodyControl?: boolean;
  expressionIntensity?: number;
  ratio?: string;
  seed?: number;
  publicFigureThreshold?: string;
}

/**
 * `POST /v1/character_performance` (Act-Two) — `character` is `{ type: "image"|"video", uri }`,
 * `reference` is `{ type: "video", uri }` (the performance to copy).
 */
export default generationAction<Input>({
  key: "character-performance",
  title: "Character Performance",
  description: "Animate a character image or video with the performance in a reference video.",
  path: "/v1/character_performance",
  params: [
    modelParam("The character model id.", "act_two"),
    {
      key: "characterType",
      label: "Character media type",
      type: "select",
      required: true,
      default: "image",
      options: [{ value: "image", label: "Image" }, { value: "video", label: "Video" }],
    },
    { key: "characterUri", label: "Character URI", type: "string", required: true },
    {
      key: "referenceUri",
      label: "Reference performance video URI",
      type: "string",
      required: true,
    },
    { key: "bodyControl", label: "Body control", type: "boolean" },
    {
      key: "expressionIntensity",
      label: "Expression intensity",
      type: "number",
      validation: { min: 1, max: 5, integer: true },
    },
    { key: "ratio", label: "Ratio", type: "string", hint: "e.g. 1280:720, 960:960." },
    SEED,
    MODERATION,
  ],
  build: (i) => ({
    character: {
      type: need(i.characterType, "characterType"),
      uri: need(i.characterUri, "characterUri"),
    },
    reference: { type: "video", uri: need(i.referenceUri, "referenceUri") },
    bodyControl: i.bodyControl,
    expressionIntensity: i.expressionIntensity,
    ratio: i.ratio,
    seed: i.seed,
    contentModeration: moderation(i.publicFigureThreshold),
  }),
});
