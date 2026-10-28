/**
 * Building Graph's `message` resource from the shared composition params.
 *
 * https://learn.microsoft.com/en-us/graph/api/resources/message
 *
 * Shared by Send Message (`POST /me/sendMail`, which wraps this under
 * `message`) and Create Draft (`POST /me/messages`, which posts it directly) —
 * the same resource, two envelopes.
 */
import { compact, itemBody, type Recipient, toRecipients } from "./client.ts";

/** One `#microsoft.graph.fileAttachment`. `contentBytes` is base64. */
export interface AttachmentInput {
  name: string;
  contentType?: string;
  contentBytes: string;
}

export interface MessageInput {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  from?: string;
  subject?: string;
  bodyContent?: string;
  bodyType?: string;
  importance?: string;
  attachments?: AttachmentInput[];
}

export interface GraphMessage {
  [key: string]: unknown;
  subject?: string;
  body?: { contentType: "Text" | "HTML"; content: string };
  toRecipients?: Recipient[];
  ccRecipients?: Recipient[];
  bccRecipients?: Recipient[];
  replyTo?: Recipient[];
  from?: Recipient;
  importance?: string;
  attachments?: Array<Record<string, unknown>>;
}

/**
 * Assemble the `message` resource, omitting every property the caller left
 * unset. Omission matters: an explicit `null`/`[]` is a meaningful instruction
 * to Graph on the draft-update path, so "not supplied" must not become "clear
 * this field".
 */
export function buildMessage(input: MessageInput): GraphMessage {
  const from = toRecipients(input.from ? [input.from] : undefined);
  return compact<GraphMessage>({
    subject: input.subject,
    body: itemBody(input.bodyContent, input.bodyType),
    toRecipients: toRecipients(input.to),
    ccRecipients: toRecipients(input.cc),
    bccRecipients: toRecipients(input.bcc),
    replyTo: toRecipients(input.replyTo),
    from: from?.[0],
    importance: input.importance,
    attachments: buildAttachments(input.attachments),
  }) as GraphMessage;
}

/**
 * Graph discriminates attachment kinds by `@odata.type`; the inline-bytes kind
 * is `#microsoft.graph.fileAttachment`. Only that kind is supported here —
 * `itemAttachment` and `referenceAttachment` need a nested resource or a
 * sharing URL, neither of which a form field can supply honestly.
 */
function buildAttachments(
  attachments?: AttachmentInput[],
): Array<Record<string, unknown>> | undefined {
  const usable = (attachments ?? []).filter((a) => a?.name && a?.contentBytes);
  if (!usable.length) return undefined;
  return usable.map((a) =>
    compact({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
    })
  );
}
