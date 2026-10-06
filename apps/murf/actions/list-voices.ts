import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  model?: string;
  locale?: string;
  gender?: string;
  style?: string;
  search?: string;
}

interface Voice {
  voiceId?: string;
  displayName?: string;
  gender?: string;
  locale?: string;
  description?: string;
  supportedLocales?: Record<string, { availableStyles?: string[]; detail?: string }>;
}

export function filterVoices(voices: Voice[], input: Input): Voice[] {
  const locale = input.locale?.trim().toLowerCase();
  const style = input.style?.trim().toLowerCase();
  const search = input.search?.trim().toLowerCase();
  return voices.filter((v) => {
    if (input.gender && v.gender !== input.gender) return false;
    const locales = Object.entries(v.supportedLocales ?? {});
    if (locale) {
      const own = v.locale?.toLowerCase() === locale;
      if (!own && !locales.some(([k]) => k.toLowerCase() === locale)) return false;
    }
    if (style) {
      const hit = locales.some(([k, d]) =>
        (!locale || k.toLowerCase() === locale) &&
        (d.availableStyles ?? []).some((s) => s.toLowerCase() === style)
      );
      if (!hit) return false;
    }
    if (search) {
      const hay = `${v.voiceId ?? ""} ${v.displayName ?? ""} ${v.description ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

const listVoices: ActionDefinition<Input> = {
  key: "list-voices",
  type: "search",
  resource: "voice",
  title: "List Voices",
  description:
    "List the voices available for synthesis (GET /v1/speech/voices). Murf returns the whole catalogue in one response with no pagination; the locale, gender, style and search filters are applied here, after the call.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "select",
      options: [{ value: "gen2", label: "Gen2" }, { value: "falcon-2", label: "Falcon 2" }],
      hint: "Defaults to Gen2, the model Synthesize Speech uses.",
    },
    { key: "locale", label: "Locale filter", type: "string", placeholder: "en-US" },
    {
      key: "gender",
      label: "Gender filter",
      type: "select",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "NonBinary", label: "Non-binary" },
      ],
    },
    { key: "style", label: "Style filter", type: "string", placeholder: "Conversational" },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches voice ID, name or description.",
    },
  ],
  output: [
    { key: "voices", type: "array", label: "Voices" },
    { key: "count", type: "number", label: "Voices returned after filtering" },
    { key: "total", type: "number", label: "Voices in the catalogue" },
  ],

  async execute(input, ctx) {
    const all = await new MurfClient(ctx).call<Voice[]>("/v1/speech/voices", {
      query: { model: input.model },
    });
    if (!Array.isArray(all)) throw new Error("Murf returned an unexpected voices response");
    const voices = filterVoices(all, input);
    return { voices, count: voices.length, total: all.length };
  },
};

export default listVoices;
