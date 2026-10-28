import type { ActionDefinition } from "@w6w/types";
import { jsonParam, MessengerClient } from "../lib/client.ts";

interface Input {
  questions: unknown;
  localized?: unknown;
}

interface Question {
  question: string;
  payload: string;
}

interface IceBreaker {
  locale: string;
  call_to_actions: Question[];
}

/**
 * Set ice breakers (up to 4 frequently-asked questions) — `POST /me/messenger_profile` with
 * `ice_breakers` in the localized format Meta recommends: one object per locale, the
 * `default` locale being REQUIRED. Setting ice breakers through the API disables editing
 * custom questions in the Page Inbox UI.
 */
const setIceBreakers: ActionDefinition<Input, { result: string }> = {
  key: "set-ice-breakers",
  type: "perform",
  resource: "profile",
  title: "Set Ice Breakers",
  description: "Set the FAQ questions shown to people who open a new conversation.",
  idempotent: true,
  params: [
    {
      key: "questions",
      label: "Default questions (JSON array)",
      type: "json",
      required: true,
      hint:
        'Up to 4: [{"question":"What are your hours?","payload":"HOURS"}]. The payload comes back as a messaging_postbacks event.',
    },
    {
      key: "localized",
      label: "Other locales (JSON array)",
      type: "json",
      hint: 'e.g. [{"locale":"en_GB","call_to_actions":[{"question":"…","payload":"…"}]}]',
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (success)" }],

  execute(input, ctx) {
    const questions = jsonParam<Question[]>("questions", input.questions);
    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 4) {
      throw new Error("questions must be an array of 1 to 4 questions");
    }
    const iceBreakers: IceBreaker[] = [{ locale: "default", call_to_actions: questions }];
    if (input.localized !== undefined && input.localized !== "") {
      const extra = jsonParam<IceBreaker[]>("localized", input.localized);
      if (!Array.isArray(extra)) throw new Error("localized must be a JSON array");
      iceBreakers.push(...extra);
    }
    return new MessengerClient(ctx).request<{ result: string }>("/me/messenger_profile", {
      method: "POST",
      body: { ice_breakers: iceBreakers },
    });
  },
};

export default setIceBreakers;
