import type { ActionDefinition } from "@w6w/types";
import { boolString, compact, DiscourseClient, unset } from "../lib/client.ts";
import { successOutput, topicStatusOptions } from "../lib/params.ts";

/**
 * `PUT /t/{id}/status.json` — close, pin, archive or unlist a topic.
 *
 * This endpoint is the API's own stated exception to its boolean rule. The API
 * reference says booleans are "a lowercase `true` or `false` value unless noted
 * otherwise", and here it is noted otherwise: `enabled` is typed `string` with
 * `enum: ["true", "false"]`. Sending a JSON boolean is the mistake this action
 * exists to make impossible — `boolString` produces the token, and the unit test
 * pins that the wire value is quoted.
 *
 * `until` is only meaningful for the two pin statuses ("Only required for
 * `pinned` and `pinned_globally`"), which is why it is `advanced` and hinted
 * rather than promoted next to the status selector.
 *
 * Note the polarity of `visible`: enabling it lists the topic, disabling it
 * unlists it. There is no separate "unlist" status.
 */
interface Input {
  topicId: number | string;
  status: string;
  enabled: boolean;
  until?: string;
}

const topicSetStatus: ActionDefinition<Input> = {
  key: "topic-set-status",
  type: "perform",
  resource: "topic",
  title: "Set Topic Status",
  description: "Close, pin, archive or unlist a topic.",
  // Setting a status a topic already has is a no-op on Discourse's side.
  idempotent: true,
  params: [
    {
      key: "topicId",
      label: "Topic ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: topicStatusOptions,
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      required: true,
      default: true,
      hint: "On applies the status; off removes it. For `visible`, off unlists the topic.",
    },
    {
      key: "until",
      label: "Until",
      type: "string",
      advanced: true,
      placeholder: "2030-12-31",
      hint: "Only used by `pinned` and `pinned_globally`. A date, e.g. 2030-12-31.",
    },
  ],
  output: [
    ...successOutput,
    { key: "topic_status_update", type: "object", label: "Scheduled status update" },
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(
      `/t/${encodeURIComponent(String(input.topicId))}/status.json`,
      {
        method: "PUT",
        body: compact({
          status: input.status,
          // Documented as a STRING enum on this endpoint, not a JSON boolean.
          enabled: boolString(input.enabled),
          until: unset(input.until),
        }),
      },
    );
  },
};

export default topicSetStatus;
