import type { Param } from "@w6w/types";
import { compact, toList } from "./client.ts";

type Input = Record<string, unknown>;

/** Content/Options params shared by the transactional and bulk sends. */
export const contentParams: Param[] = [
  {
    key: "from",
    label: "From",
    type: "string",
    hint: 'A verified sender, optionally with a name: "Jane <jane@example.com>".',
  },
  { key: "replyTo", label: "Reply-To", type: "string" },
  { key: "subject", label: "Subject", type: "string" },
  { key: "bodyHtml", label: "HTML body", type: "text" },
  { key: "bodyText", label: "Plain-text body", type: "text" },
  {
    key: "templateName",
    label: "Template name",
    type: "string",
    hint: "A stored template; supplies the body and subject if you leave them out.",
  },
  {
    key: "merge",
    label: "Merge fields",
    type: "json",
    hint: 'Object of values for `{placeholder}` tokens, e.g. {"firstname": "Ada"}.',
  },
  {
    key: "attachFiles",
    label: "Attach files",
    type: "string",
    hint: "Comma-separated names of files already uploaded to the account.",
  },
  {
    key: "channelName",
    label: "Channel name",
    type: "string",
    hint: "Tag the send with a channel for reporting.",
  },
  { key: "trackOpens", label: "Track opens", type: "boolean" },
  { key: "trackClicks", label: "Track clicks", type: "boolean" },
];

export function buildContent(input: Input): Record<string, unknown> {
  const body: Array<Record<string, string>> = [];
  if (input.bodyHtml) {
    body.push({ ContentType: "HTML", Content: String(input.bodyHtml), Charset: "utf-8" });
  }
  if (input.bodyText) {
    body.push({ ContentType: "PlainText", Content: String(input.bodyText), Charset: "utf-8" });
  }
  const templateName = input.templateName ? String(input.templateName) : undefined;
  if (body.length === 0 && !templateName) {
    throw new Error("Provide an HTML body, a plain-text body or a template name");
  }
  const merge = input.merge;
  if (merge !== undefined && merge !== null && merge !== "") {
    if (typeof merge !== "object" || Array.isArray(merge)) {
      throw new Error("Merge fields must be a JSON object");
    }
  }
  return compact({
    Body: body.length ? body : undefined,
    From: input.from,
    ReplyTo: input.replyTo,
    Subject: input.subject,
    TemplateName: templateName,
    Merge: merge,
    AttachFiles: toList(input.attachFiles as string | undefined),
  });
}

export function buildOptions(input: Input): Record<string, unknown> | undefined {
  const options = compact({
    ChannelName: input.channelName,
    TrackOpens: input.trackOpens,
    TrackClicks: input.trackClicks,
  });
  return Object.keys(options).length ? options : undefined;
}
