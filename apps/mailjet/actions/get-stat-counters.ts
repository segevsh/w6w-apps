import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";

interface Input {
  counterSource: string;
  counterResolution: string;
  counterTiming: string;
  sourceId?: string;
  fromTs?: string;
  toTs?: string;
}

export interface MailjetStatCounters {
  APIKeyID?: number;
  SourceID?: number;
  Timeslice?: string;
  Total?: number;
  MessageSentCount?: number;
  MessageQueuedCount?: number;
  MessageDeferredCount?: number;
  MessageBlockedCount?: number;
  MessageHardBouncedCount?: number;
  MessageSoftBouncedCount?: number;
  MessageOpenedCount?: number;
  MessageClickedCount?: number;
  MessageSpamCount?: number;
  MessageUnsubscribedCount?: number;
  MessageWorkFlowExitedCount?: number;
  EventClickedCount?: number;
  EventOpenedCount?: number;
  EventSpamCount?: number;
  EventUnsubscribedCount?: number;
  EventWorkflowExitedCount?: number;
  EventClickDelay?: number;
  EventOpenDelay?: number;
}

/**
 * Aggregated sending statistics — opens, clicks, bounces, spam complaints —
 * over a chosen slice of time.
 *
 * This is the app's "visibility" surface, and it is the fiddliest endpoint
 * Mailjet publishes, because three mandatory dimensions have to agree with each
 * other:
 *
 *   - **`CounterSource`** — what is being counted over: `APIKey`, `Campaign`,
 *     `List` or `Sender`.
 *   - **`CounterResolution`** — the timescale: `Lifetime`, `Day`, `Hour`, or
 *     `Highest`.
 *   - **`CounterTiming`** — which timestamp a row is filed under: `Message` (when
 *     it was sent) or `Event` (when the open/click happened). This is the one
 *     that quietly changes the answer: counting clicks by `Message` attributes a
 *     click today to the send last week, while `Event` files it under today. Both
 *     are legitimate; they answer different questions.
 *
 * Two conditional requirements follow, both enforced by Mailjet rather than here:
 * `FromTS` becomes mandatory whenever `CounterResolution` is anything other than
 * `Lifetime`, and `SourceID` becomes mandatory whenever `CounterSource` is
 * `Campaign`, `List` or `Sender` (it is meaningless for `APIKey`, which is the
 * whole account). Defaults below — `APIKey` + `Lifetime` + `Message` — are the
 * one combination that needs neither, so the action does something useful with
 * no optional input at all.
 *
 * The `Message*Count` and `Event*Count` families are not duplicates:
 * `MessageOpenedCount` counts *messages that were opened at least once*, while
 * `EventOpenedCount` counts *open events*, which is larger whenever anyone opens
 * twice.
 */
const getStatCounters: ActionDefinition<Input> = {
  key: "get-stat-counters",
  type: "read",
  resource: "statistics",
  title: "Get Statistics",
  description:
    "Aggregated send/open/click/bounce counters (GET /v3/REST/statcounters). `FromTS` is " +
    "required unless the resolution is `Lifetime`; `sourceId` is required unless the source is " +
    "`APIKey`.",
  params: [
    {
      key: "counterSource",
      label: "Counter source",
      type: "select",
      required: true,
      default: "APIKey",
      options: [
        { value: "APIKey", label: "Whole API key (account)" },
        { value: "Campaign", label: "Campaign" },
        { value: "List", label: "Contact list" },
        { value: "Sender", label: "Sender" },
      ],
    },
    {
      key: "counterResolution",
      label: "Resolution",
      type: "select",
      required: true,
      default: "Lifetime",
      options: [
        { value: "Lifetime", label: "Lifetime (single row)" },
        { value: "Day", label: "Per day" },
        { value: "Hour", label: "Per hour" },
        { value: "Highest", label: "Highest available" },
      ],
      hint: "Anything other than `Lifetime` makes `fromTs` mandatory.",
    },
    {
      key: "counterTiming",
      label: "Timing",
      type: "select",
      required: true,
      default: "Message",
      options: [
        { value: "Message", label: "By send time" },
        { value: "Event", label: "By event time" },
      ],
      hint: "`Message` files an open under the day it was sent; `Event` under the day it happened.",
    },
    {
      key: "sourceId",
      label: "Source ID(s)",
      type: "string",
      hint: "Comma-separated IDs. Required when the source is Campaign, List or Sender.",
    },
    {
      key: "fromTs",
      label: "From",
      type: "string",
      hint: "Unix timestamp or RFC3339. Required unless the resolution is `Lifetime`.",
    },
    { key: "toTs", label: "To", type: "string", hint: "Unix timestamp or RFC3339." },
  ],
  output: [
    { key: "Data", type: "array", label: "Counters" },
    { key: "Count", type: "number", label: "Count" },
    { key: "Total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetStatCounters>>("/statcounters", {
      query: {
        CounterSource: input.counterSource,
        CounterResolution: input.counterResolution,
        CounterTiming: input.counterTiming,
        SourceID: input.sourceId,
        FromTS: input.fromTs,
        ToTS: input.toTs,
      },
    });
  },
};

export default getStatCounters;
