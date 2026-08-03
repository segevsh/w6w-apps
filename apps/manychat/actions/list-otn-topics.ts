import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatOtnTopic } from "../lib/client.ts";

/**
 * Every One-Time Notification (OTN) topic on the Page.
 *
 * `GET /fb/page/getOtnTopics` → `{ status, data: [{ id, name, description }] }`.
 *
 * ## Why this exists at all
 *
 * OTN is one of the two escape hatches out of Meta's messaging window. A
 * subscriber who taps "Notify me" on an OTN request grants permission for
 * **one** follow-up message on that named topic. `send-content`'s
 * `otn_topic_name` parameter spends that permission — and it takes the topic's
 * **name**, not its id, which is why this listing matters: it is the only
 * published way to discover the exact strings the Page has defined, and a
 * mistyped topic name is a send that does not happen.
 *
 * The other escape hatch is `message_tag` (Meta's fixed vocabulary — see
 * `send-content`). Read README.md "The 24-hour window is real" before relying on
 * either.
 */
const listOtnTopics: ActionDefinition<Record<string, never>> = {
  key: "list-otn-topics",
  type: "read",
  resource: "otn-topic",
  title: "List OTN Topics",
  description: "Every One-Time Notification topic on the Page (GET /fb/page/getOtnTopics) — " +
    "`{ id, name, description }`. Send Content's `otnTopicName` takes the name from here.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "OTN topics" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatOtnTopic[]>>(
      "/fb/page/getOtnTopics",
    );
  },
};

export default listOtnTopics;
