import { detailAction } from "../lib/repos.ts";

/**
 * One model's metadata.
 *
 * `siblings` lists the repository's files, which is how to tell a
 * safetensors-only model from one that still ships a pickle, and `config`
 * carries the architecture. Neither is present on the search endpoint's
 * summaries — this is the call that has them.
 */
export default detailAction({
  kind: "models",
  key: "model-get",
  title: "Get a model",
  description:
    "One model's card, config and file list. A renamed id redirects and this reports it — the " +
    "only sign that a stored id is historical.",
});
