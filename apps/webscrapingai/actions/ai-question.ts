import type { ActionDefinition } from "@w6w/types";
import { requireText, WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  question: string;
}

const aiQuestion: ActionDefinition<Input> = {
  key: "ai-question",
  type: "read",
  resource: "ai",
  title: "Ask a Question About a Page",
  description:
    "Fetch a page through proxies and headless Chromium, then answer a question or instruction " +
    "about it with an LLM. Returns plain text.",
  params: [
    ...pageParams.slice(0, 1),
    {
      key: "question",
      label: "Question or instruction",
      type: "text",
      required: true,
      placeholder: "What is the summary of this page content?",
    },
    ...pageParams.slice(1),
  ],
  output: [
    { key: "answer", type: "string", label: "The model's answer" },
    { key: "requestId", type: "string", label: "Vendor request id" },
  ],

  async execute(input, ctx) {
    const res = await new WsaiClient(ctx).raw("/ai/question", {
      ...pageQuery(input),
      question: requireText(input.question, "Question"),
    });
    return { answer: res.text, requestId: res.requestId };
  },
};

export default aiQuestion;
