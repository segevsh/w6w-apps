import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;

  cannedType?: string;
  text?: string;
  type?: string;
  required?: boolean;
  waiver?: string;
  choices?: string[];
  parentChoiceId?: string;
  extra?: Record<string, unknown>;
}

const createDefaultQuestion: ActionDefinition<Input> = {
  key: "create-default-question",
  type: "perform",
  idempotent: false,
  resource: "question",
  title: "Create Default Question",
  description: "Creates a default (canned) registration question on the event on Eventbrite.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },

    {
      key: "cannedType",
      label: "Canned type",
      type: "string",
      required: true,
      hint: "e.g. prefix, first_name, last_name, email, cell_phone, job_title, company, website.",
    },
    { key: "text", label: "Question text", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["checkbox", "dropdown", "text", "paragraph", "radio", "waiver"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "required", label: "Answer required", type: "boolean" },
    { key: "waiver", label: "Waiver content", type: "text" },
    {
      key: "choices",
      label: "Choices",
      type: "array",
      item: { type: "string" },
      hint: "Answer choices for multiple-choice questions.",
    },
    { key: "parentChoiceId", label: "Parent choice ID", type: "string" },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [{ key: "question", type: "object", label: "Default question" }],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const question: Record<string, unknown> = {};
    if (input.cannedType !== undefined) question.canned_type = input.cannedType;
    if (input.text !== undefined) question.question = { html: input.text };
    if (input.type !== undefined) question.type = input.type;
    if (input.required !== undefined) question.required = input.required;
    if (input.waiver !== undefined) question.waiver = input.waiver;
    if (input.choices) question.choices = input.choices.map((c) => ({ answer: { html: c } }));
    if (input.parentChoiceId !== undefined) question.parent_choice_id = input.parentChoiceId;
    return client.request(`/events/${encodeURIComponent(input.eventId)}/canned_questions/`, {
      method: "POST",
      body: { question: deepMerge(question, input.extra) },
    });
  },
};

export default createDefaultQuestion;
