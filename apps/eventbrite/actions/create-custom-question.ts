import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  text: string;
  type: string;
  respondent?: string;
  required?: boolean;
  displayAnswerOnOrder?: boolean;
  waiver?: string;
  choices?: string[];
  ticketClassIds?: string[];
  parentId?: string;
  parentChoiceId?: string;
  extra?: Record<string, unknown>;
}

const createCustomQuestion: ActionDefinition<Input> = {
  key: "create-custom-question",
  type: "perform",
  idempotent: false,
  resource: "question",
  title: "Create Custom Question",
  description: "Creates a custom registration question on the event on Eventbrite.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "text", label: "Question text", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "text",
      options: ["checkbox", "dropdown", "text", "paragraph", "radio", "waiver"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "respondent",
      label: "Respondent",
      type: "select",
      options: [
        { value: "ticket_buyer", label: "Ticket buyer" },
        { value: "attendee", label: "Each attendee" },
      ],
    },
    { key: "required", label: "Answer required", type: "boolean" },
    { key: "displayAnswerOnOrder", label: "Display answer on order", type: "boolean" },
    { key: "waiver", label: "Waiver content", type: "text" },
    {
      key: "choices",
      label: "Choices",
      type: "array",
      item: { type: "string" },
      hint: "Answer choices for multiple-choice questions.",
    },
    {
      key: "ticketClassIds",
      label: "Limit to ticket class IDs",
      type: "array",
      item: { type: "string" },
    },
    { key: "parentId", label: "Parent question ID", type: "string" },
    { key: "parentChoiceId", label: "Parent choice ID", type: "string" },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "question", type: "object", label: "Question text" },
    { key: "type", type: "string", label: "Type" },
    { key: "required", type: "boolean", label: "Required" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const question: Record<string, unknown> = {
      question: { html: input.text },
      type: input.type,
    };
    if (input.respondent !== undefined) question.respondent = input.respondent;
    if (input.required !== undefined) question.required = input.required;
    if (input.displayAnswerOnOrder !== undefined) {
      question.display_answer_on_order = input.displayAnswerOnOrder;
    }
    if (input.waiver !== undefined) question.waiver = input.waiver;
    if (input.choices) question.choices = input.choices.map((c) => ({ answer: { html: c } }));
    if (input.ticketClassIds) question.ticket_classes = input.ticketClassIds.map((id) => ({ id }));
    if (input.parentId !== undefined) question.parent_id = input.parentId;
    if (input.parentChoiceId !== undefined) question.parent_choice_id = input.parentChoiceId;
    return client.request(`/events/${encodeURIComponent(input.eventId)}/questions/`, {
      method: "POST",
      body: { question: deepMerge(question, input.extra) },
    });
  },
};

export default createCustomQuestion;
