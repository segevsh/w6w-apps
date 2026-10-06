import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, WsaiClient } from "../lib/client.ts";

interface Input {
  url: string;
  country?: string;
  transcript?: boolean;
  transcriptLanguage?: string;
}

const dataGet: ActionDefinition<Input> = {
  key: "data-get",
  type: "read",
  resource: "data",
  title: "Get Structured Page Data",
  description:
    "Structured JSON for a page on a supported site (YouTube, TikTok, X, LinkedIn, Instagram, " +
    "Reddit and more over time). The shape of `data` depends on the detected provider and type.",
  params: [
    {
      key: "url",
      label: "Page URL",
      type: "string",
      required: true,
      placeholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      key: "country",
      label: "Proxy country",
      type: "string",
      placeholder: "us",
      hint: "Two-letter code of one of the API's proxy countries (vendor default us).",
    },
    {
      key: "transcript",
      label: "Include transcript",
      type: "boolean",
      default: false,
      hint: "YouTube videos only. `data.transcript` is null when no captions match.",
    },
    {
      key: "transcriptLanguage",
      label: "Transcript language",
      type: "string",
      placeholder: "en",
      showIf: { "==": [{ var: "transcript" }, true] },
      hint: "Caption language to pick. Without it English is preferred, then the first track.",
    },
  ],
  output: [
    { key: "request_parameters", type: "object", label: "URL, detected provider and page type" },
    { key: "parse_status", type: "string", label: "ok, parse_failed or not_found" },
    {
      key: "data",
      type: "object",
      label: "The page's fields (shape depends on provider and type)",
    },
  ],

  async execute(input, ctx) {
    return await new WsaiClient(ctx).json(
      "/data",
      compact({
        url: requireText(input.url, "Page URL"),
        country: input.country?.trim().toLowerCase(),
        transcript: input.transcript || undefined,
        transcript_language: input.transcript ? input.transcriptLanguage?.trim() : undefined,
      }),
    );
  },
};

export default dataGet;
