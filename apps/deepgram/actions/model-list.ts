import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient, query } from "../lib/client.ts";

/**
 * `GET /v1/models` — the speech-to-text and text-to-speech models available.
 *
 * Worth reading rather than hard-coding, for two reasons. Deepgram names its
 * **voices as models** too — `aura-2-thalia-en` is a voice, not an engine — so
 * this is the list `speech-generate` picks from as well as `audio-transcribe`.
 * And model names change: a workflow pinned to a name that has been superseded
 * keeps working until it does not.
 *
 * `includeOutdated` is off by default, which is right for choosing a model and
 * wrong for explaining an old request — `request-get` on a six-month-old
 * transcription names a model this list will not show unless it is on.
 *
 * The project-scoped variant reflects what **this** project may use, which can
 * be narrower than the public catalogue on an enterprise contract.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List models",
  description:
    "Speech-to-text models and text-to-speech voices — Deepgram names both as models. Include " +
    "outdated ones to explain an old request rather than to choose a new model.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "project",
      options: [
        { value: "project", label: "What this project may use" },
        { value: "public", label: "Deepgram's whole catalogue" },
      ],
      hint: "An enterprise contract can be narrower than the public catalogue.",
    },
    {
      key: "includeOutdated",
      label: "Include Outdated",
      type: "boolean",
      default: false,
      hint: "Needed to resolve the model named on an old request.",
    },
  ],
  output: [
    { key: "stt", type: "array", label: "Speech-to-text models" },
    { key: "tts", type: "array", label: "Text-to-speech voices" },
    { key: "count", type: "number", label: "Models returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DeepgramClient(ctx);
    const scope = p.scope === undefined ? "project" : String(p.scope);
    const path = scope === "public"
      ? "/v1/models"
      : `/v1/projects/${encodeURIComponent(client.projectId)}/models`;

    const body = await client.request<{ stt?: unknown[]; tts?: unknown[] }>(path, {
      query: query({ include_outdated: p.includeOutdated === true ? true : undefined }),
    });

    const stt = body?.stt ?? [];
    const tts = body?.tts ?? [];
    return { stt, tts, count: stt.length + tts.length };
  },
};

export default action;
