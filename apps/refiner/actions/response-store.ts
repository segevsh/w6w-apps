import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, contactRef, RefinerClient, toList } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  uuid?: string;
  formUuid: string;
  answers?: unknown;
  date?: string;
  preventDuplicates?: boolean;
  tags?: string[] | string;
  account?: unknown;
}

/** Keys a caller's `answers` object must not overwrite. */
const RESERVED = [
  "id",
  "email",
  "uuid",
  "form_uuid",
  "date",
  "prevent_duplicates",
  "tags",
  "account",
];

const responseStore: ActionDefinition<Input> = {
  key: "response-store",
  type: "perform",
  resource: "response",
  title: "Store Response",
  description:
    "Record a survey response for a user — historical data, or answers collected in your own " +
    "UI. The survey must already exist (it can be an empty, unpublished container). Use the " +
    "survey's question identifiers as the keys of Answers so reports pick them up.",
  idempotent: false,
  params: [
    { key: "formUuid", label: "Survey UUID", type: "string", required: true },
    { key: "id", label: "User ID", type: "string", hint: "Give one of user id, email or uuid." },
    { key: "email", label: "Email", type: "string" },
    { key: "uuid", label: "Refiner contact UUID", type: "string" },
    {
      key: "answers",
      label: "Answers",
      type: "json",
      hint: 'Object of question identifier to value, e.g. {"nps_question": 9, "comment": "Great"}.',
    },
    {
      key: "date",
      label: "Response date",
      type: "string",
      hint: "ISO 8601. Defaults to now.",
    },
    {
      key: "preventDuplicates",
      label: "Prevent duplicates",
      type: "boolean",
      default: true,
      hint: "Turn off to allow an identical response to be stored again.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated, at most 20.",
    },
    {
      key: "account",
      label: "Account",
      type: "json",
      hint: 'Group the user under an account, e.g. {"id":"acme","name":"Acme Inc."}.',
    },
  ],
  output: [
    { key: "message", type: "string", label: "`ok` on success" },
    { key: "uuid", type: "string", label: "Response UUID" },
  ],

  async execute(input, ctx) {
    const answers = asObject(input.answers, "answers") ?? {};
    for (const key of RESERVED) {
      if (key in answers) {
        throw new Error(`answers may not use the reserved key "${key}"`);
      }
    }
    const tags = toList(input.tags);
    if (tags && tags.length > 20) throw new Error("at most 20 tags are allowed");
    const account = asObject(input.account, "account");
    const body = {
      ...answers,
      ...contactRef(input),
      form_uuid: input.formUuid,
      ...compact({
        date: input.date,
        prevent_duplicates: input.preventDuplicates === false ? false : undefined,
        tags,
      }),
      ...(account ? { account } : {}),
    };
    return await new RefinerClient(ctx).json("/responses", { method: "POST", body });
  },
};

export default responseStore;
