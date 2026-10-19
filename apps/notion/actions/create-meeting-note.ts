import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  title?: string;
  language?:
    | "auto"
    | "en"
    | "zh-CN"
    | "zh-TW"
    | "es"
    | "fr"
    | "de"
    | "ja"
    | "ko"
    | "pt"
    | "ru"
    | "th"
    | "vi"
    | "id"
    | "da"
    | "fi"
    | "no"
    | "nl"
    | "it"
    | "sv"
    | "ar"
    | "he"
    | "pl";
  options?: Record<string, unknown>;
  source: Record<string, unknown>;
  parent?: Record<string, unknown>;
}

/** POST /v1/blocks/meeting_notes — create-meeting-note. */
const action: ActionDefinition<Input> = {
  key: "create-meeting-note",
  type: "perform",
  resource: "block",
  title: "Create Meeting Note",
  description: "Create a meeting note.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "meeting_notes", "type": "object", "label": "Meeting notes" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_by", "type": "object", "label": "Last edited by" },
    { "key": "has_children", "type": "boolean", "label": "Has children" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
  ],
  idempotent: false,
  params: [
    { "key": "title", "label": "Title", "type": "string", "hint": "Title for the meeting note." },
    {
      "key": "language",
      "label": "Language",
      "type": "select",
      "options": [
        { "value": "auto", "label": "auto" },
        { "value": "en", "label": "en" },
        { "value": "zh-CN", "label": "zh-CN" },
        { "value": "zh-TW", "label": "zh-TW" },
        { "value": "es", "label": "es" },
        { "value": "fr", "label": "fr" },
        { "value": "de", "label": "de" },
        { "value": "ja", "label": "ja" },
        { "value": "ko", "label": "ko" },
        { "value": "pt", "label": "pt" },
        { "value": "ru", "label": "ru" },
        { "value": "th", "label": "th" },
        { "value": "vi", "label": "vi" },
        { "value": "id", "label": "id" },
        { "value": "da", "label": "da" },
        { "value": "fi", "label": "fi" },
        { "value": "no", "label": "no" },
        { "value": "nl", "label": "nl" },
        { "value": "it", "label": "it" },
        { "value": "sv", "label": "sv" },
        { "value": "ar", "label": "ar" },
        { "value": "he", "label": "he" },
        { "value": "pl", "label": "pl" },
      ],
      "hint": "Language hint for transcription. Defaults to automatic detection.",
    },
    {
      "key": "options",
      "label": "Options",
      "type": "json",
      "hint": "Optional processing settings.",
    },
    { "key": "source", "label": "Source", "type": "json", "required": true },
    { "key": "parent", "label": "Parent", "type": "json" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/meeting_notes`, {
      method: "POST",
      body: {
        "title": input.title,
        "language": input.language,
        "options": input.options,
        "source": input.source,
        "parent": input.parent,
      },
    });
  },
};

export default action;
