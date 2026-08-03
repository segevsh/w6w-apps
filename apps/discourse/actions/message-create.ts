import type { ActionDefinition } from "@w6w/types";
import { compact, csvString, DiscourseClient } from "../lib/client.ts";
import { postOutput, rawParam } from "../lib/params.ts";

/**
 * Send a private message — `POST /posts.json` with `archetype: private_message`.
 *
 * Third and last of the three actions over that one endpoint (see
 * `topic-create` for the split). Its requirements are the strictest: `title`,
 * `raw`, `archetype` and `target_recipients` all have to be present, and the
 * reference states each of them:
 *
 *   - `archetype` — "Required for new private message", example `private_message`
 *   - `target_recipients` — "Required for private message, comma separated",
 *     example `blake,sam`
 *   - `title` — "Required if creating a new topic or new private message"
 *
 * `archetype` is a constant here, not a parameter: `private_message` is the only
 * value that makes this action what it is, and offering the field could only
 * produce a wrong answer.
 *
 * **`target_usernames` is deprecated.** The reference marks it
 * `deprecated: true` with "Use target_recipients instead". Only
 * `target_recipients` is sent. The distinction matters beyond naming:
 * recipients may be groups as well as users, which is why the field is not
 * called "usernames" here either.
 */
interface Input {
  title: string;
  raw: string;
  targetRecipients: string;
}

/** The one archetype value that makes `POST /posts.json` produce a PM. */
export const PRIVATE_MESSAGE_ARCHETYPE = "private_message";

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Send Private Message",
  description: "Open a private message thread with one or more users or groups.",
  // Each call opens a new PM thread; there is nothing for a retry to converge on.
  idempotent: false,
  params: [
    { key: "title", label: "Subject", type: "string", required: true },
    rawParam,
    {
      key: "targetRecipients",
      label: "Recipients",
      type: "string",
      required: true,
      placeholder: "blake,sam",
      hint:
        "Comma-separated usernames or group names. Discourse takes a string here, not a list. " +
        "(`target_usernames` is the deprecated spelling and is not used.)",
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/posts.json", {
      method: "POST",
      body: compact({
        title: input.title,
        raw: input.raw,
        archetype: PRIVATE_MESSAGE_ARCHETYPE,
        target_recipients: csvString(input.targetRecipients),
      }),
    });
  },
};

export default messageCreate;
