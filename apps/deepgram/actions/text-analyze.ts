import type { ActionDefinition } from "@w6w/types";
import { csv, DeepgramClient, query } from "../lib/client.ts";

/**
 * `POST /v1/read` — sentiment, topics, intents and summary over text.
 *
 * The same intelligence layer `audio-transcribe` can apply, pointed at text
 * that never was audio: a support ticket, a review, an email thread. It takes
 * either `{text}` or `{url}`.
 *
 * ## Custom topics and intents are the reason to use this over a general model
 *
 * Deepgram will find generic topics on its own, which is rarely what anyone
 * wants. `customTopic` and `customIntent` name **your** categories — "billing
 * dispute", "cancellation risk", "wants a demo" — and the `*Mode` parameters
 * decide how literally they are read:
 *
 *   - **`strict`** matches only what you named, which is predictable and
 *     misses paraphrases;
 *   - **`extended`** lets the model generalise, which catches more and
 *     occasionally invents a category you did not ask for.
 *
 * Strict is the default here, because a workflow routing on a category wants
 * the set of possible outcomes to be the set it was given.
 *
 * At least one analysis has to be requested — asking for none returns nothing
 * and costs a request, so this refuses first.
 */
const action: ActionDefinition = {
  key: "text-analyze",
  type: "perform",
  resource: "analysis",
  title: "Analyse text",
  description:
    "Sentiment, topics, intents and summary over text that never was audio. Name your own " +
    "categories rather than accepting the generic ones.",
  idempotent: true,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      default: "",
      hint: "Give this or a URL.",
    },
    {
      key: "url",
      label: "Text URL",
      type: "string",
      default: "",
      hint: "Deepgram fetches it, so it must be publicly reachable.",
    },
    { key: "summarize", label: "Summarize", type: "boolean", default: false },
    { key: "topics", label: "Detect Topics", type: "boolean", default: false },
    { key: "sentiment", label: "Sentiment", type: "boolean", default: false },
    { key: "intents", label: "Detect Intents", type: "boolean", default: false },
    {
      key: "customTopic",
      label: "Custom Topics",
      type: "string",
      default: "",
      placeholder: "billing dispute, cancellation risk",
      hint: "Comma-separated. Your categories rather than Deepgram's generic ones.",
    },
    {
      key: "customIntent",
      label: "Custom Intents",
      type: "string",
      default: "",
      placeholder: "wants a demo, wants to cancel",
    },
    {
      key: "mode",
      label: "Matching Mode",
      type: "select",
      default: "strict",
      options: [
        { value: "strict", label: "Strict — only the categories you named" },
        { value: "extended", label: "Extended — the model may generalise beyond them" },
      ],
      hint: "Applies to both custom topics and custom intents. Strict keeps the set of possible " +
        "outcomes equal to the set you gave, which is what a routing rule needs.",
    },
    { key: "language", label: "Language", type: "string", default: "", advanced: true },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      default: "",
      advanced: true,
      hint: "For long documents.",
    },
    { key: "tag", label: "Tags", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "results", type: "object", label: "Summary, topics, intents and sentiment" },
    { key: "metadata", type: "object", label: "Request metadata" },
    { key: "request_id", type: "string", label: "Request id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const text = String(p.text ?? "").trim();
    const url = String(p.url ?? "").trim();
    if (!text && !url) throw new Error("give `text` or a `url` to analyse");
    if (text && url) throw new Error("give either `text` or a `url`, not both");

    const bool = (v: unknown) => v === true;
    const wants = ["summarize", "topics", "sentiment", "intents"].some((k) => bool(p[k])) ||
      csv(p.customTopic) !== undefined || csv(p.customIntent) !== undefined;
    if (!wants) {
      throw new Error(
        "ask for at least one analysis — summarize, topics, sentiment, intents, or a custom " +
          "topic or intent. Requesting none returns nothing and still costs a request",
      );
    }

    const mode = p.mode === undefined ? "strict" : String(p.mode);
    const customTopic = csv(p.customTopic);
    const customIntent = csv(p.customIntent);

    const body = await new DeepgramClient(ctx).request<{ metadata?: { request_id?: string } }>(
      "/v1/read",
      {
        method: "POST",
        body: text ? { text } : { url },
        query: query({
          callback: p.callbackUrl,
          language: p.language,
          summarize: bool(p.summarize) || undefined,
          topics: bool(p.topics) || customTopic ? true : undefined,
          sentiment: bool(p.sentiment) || undefined,
          intents: bool(p.intents) || customIntent ? true : undefined,
          custom_topic: customTopic,
          custom_topic_mode: customTopic ? mode : undefined,
          custom_intent: customIntent,
          custom_intent_mode: customIntent ? mode : undefined,
          tag: csv(p.tag),
        }),
      },
    );

    // The request id only — the text is the caller's content.
    ctx.log("info", "analysed text with Deepgram", { requestId: body?.metadata?.request_id });
    return { ...body, request_id: body?.metadata?.request_id };
  },
};

export default action;
