import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemBody, seg } from "../lib/client.ts";
import { channelIdParam, messageBodyParams, subjectParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  content: string;
  contentType?: string;
  subject?: string;
  importance?: string;
}

/**
 * `POST /teams/{team-id}/channels/{channel-id}/messages`
 *
 * https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0
 *
 * Posts a new root message to a channel. Answers `201 Created` with the created
 * `chatMessage`. Requires the delegated scope `ChannelMessage.Send`, which is
 * **not** admin-consented — so this, the marquee action of the App, is one an
 * ordinary user can approve for themselves.
 *
 * Three things the reference says out loud and this comment repeats rather than
 * paraphrases:
 *
 *  - **Only `body` is mandatory.** Everything else is optional.
 *  - **This is not the migration path.** Microsoft explicitly does not recommend
 *    this endpoint for data migration; that is a separate import flow gated on
 *    `Teamwork.Migrate.All`, and is the *only* thing application permissions can
 *    do here. There is no app-only way to post an ordinary message.
 *  - **"It's a violation of the terms of use to use Microsoft Teams as a log
 *    file. Only send messages that people will read."** Worth having in the
 *    source of a workflow tool, of all places.
 *
 * `idempotent: false`, and honestly so: Graph offers no client-supplied dedupe
 * key on this endpoint — unlike calendar events, which take a `transactionId` —
 * so a retry posts a second message.
 */
const sendChannelMessage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "send-channel-message",
  type: "perform",
  resource: "channel-message",
  title: "Send Channel Message",
  description: "Post a new message to a team channel.",
  idempotent: false,
  params: [
    teamIdParam,
    channelIdParam,
    ...messageBodyParams(),
    subjectParam,
  ],
  output: [
    { key: "id", type: "string", label: "Message id" },
    { key: "webUrl", type: "string", label: "Permalink" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "etag", type: "string", label: "ETag" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    ctx.log("info", "posting channel message", {
      teamId: input.teamId,
      channelId: input.channelId,
    });

    return client.request(
      `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/messages`,
      {
        method: "POST",
        body: compact({
          body: itemBody(input.content, input.contentType),
          subject: input.subject || undefined,
          importance: input.importance,
        }),
      },
    );
  },
};

export default sendChannelMessage;
