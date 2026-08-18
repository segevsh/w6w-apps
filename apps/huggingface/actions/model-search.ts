import { searchAction } from "../lib/repos.ts";

/**
 * Search the Hub for models.
 *
 * `pipeline_tag` is the filter that matters most and is easiest to miss: it is
 * the task — `text-generation`, `image-classification`, `automatic-speech-
 * recognition` — and without it a search for "whisper" returns fine-tunes,
 * quantisations, ONNX exports and unrelated repositories with the word in the
 * card.
 */
export default searchAction({
  kind: "models",
  key: "model-search",
  title: "Search models",
  description:
    "Find models on the Hub. `pipelineTag` narrows by TASK, which is usually what separates the " +
    "model you want from a hundred fine-tunes of it.",
  extraParams: [
    {
      key: "pipelineTag",
      label: "Task",
      type: "string",
      default: "",
      placeholder: "text-generation",
      hint: "`text-generation`, `feature-extraction`, `image-classification`, " +
        "`automatic-speech-recognition`, and so on.",
    },
  ],
});
