import type { ActionDefinition } from "@w6w/types";
import {
  asJsonValue,
  ConversionsClient,
  type ConversionsResponse,
  datasetFromConnection,
} from "../lib/client.ts";
import { type HashingMode, prepareEvent, type ServerEvent } from "../lib/user-data.ts";

interface Input {
  datasetId?: string;
  events: unknown;
  hashing?: HashingMode;
  testEventCode?: string;
}

/** Meta's documented ceiling: "up to 1,000 events in data". */
const MAX_EVENTS = 1000;

/**
 * Batch form of the same endpoint `send-event` uses — `POST
 * /{dataset-id}/events` with a full `data` array. Two actions rather than one
 * because the two shapes are genuinely different jobs: `send-event` is a form
 * a person fills in, this is a pipe for events some upstream step already
 * assembled (a nightly CRM export, a `physical_store` upload).
 *
 * Events arrive in Meta's own wire shape — `event_name`, `event_time`,
 * `action_source`, `user_data`, `custom_data` — with the *unhashed* customer
 * fields, since hashing is this app's job and doing it here is the whole point.
 * Every event is still put through `lib/user-data.ts`, so the batch path has
 * exactly the same guarantee as the single path: nothing in `user_data`'s
 * contact fields reaches Meta unhashed, and a raw value under
 * `hashing: pre-hashed` fails the whole call before a byte is sent.
 *
 * `idempotent: false`, unlike `send-event`. Meta deduplicates on
 * (`event_name`, `event_id`), and the caller owns `event_id` here — this action
 * will not invent one, because stamping the invocation id onto every element of
 * a batch would collapse a thousand distinct conversions into one. A batch
 * whose elements all carry stable `event_id`s is in fact safe to retry; the
 * declaration has to describe the general case.
 */
const sendEvents: ActionDefinition<Input, ConversionsResponse> = {
  key: "send-events",
  type: "perform",
  resource: "event",
  title: "Send Conversion Events (Batch)",
  description:
    "Send up to 1000 server-side events in one request. Each event's user_data is normalised and SHA-256 hashed before it leaves this app.",
  idempotent: false,
  params: [
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      hint: "Defaults to the dataset stored on the connection. Required for OAuth connections.",
    },
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      hint:
        "JSON array of server events in Meta's wire shape — { event_name, event_time, action_source, user_data, custom_data?, event_id?, event_source_url? }. Max 1000. Use raw user_data values; this app hashes them.",
    },
    {
      key: "hashing",
      label: "Hashing",
      type: "select",
      default: "auto",
      options: [
        { value: "auto", label: "Automatic — normalise and hash raw values" },
        { value: "pre-hashed", label: "Pre-hashed — reject anything not already SHA-256" },
      ],
      hint: "Applied to every event in the batch.",
    },
    {
      key: "testEventCode",
      label: "Test Event Code",
      type: "string",
      advanced: true,
      hint: "From Events Manager → Test Events. Remove before going live.",
    },
  ],
  output: [
    { key: "events_received", type: "number", label: "Events received" },
    { key: "messages", type: "array", label: "Warnings" },
    { key: "fbtrace_id", type: "string", label: "Trace ID" },
  ],

  async execute(input, ctx) {
    const datasetId = datasetFromConnection(ctx.connection, input.datasetId);

    const parsed = asJsonValue(input.events, "Events");
    if (!Array.isArray(parsed)) throw new Error("Events must be a JSON array of server events");
    if (parsed.length === 0) throw new Error("Events is empty");
    if (parsed.length > MAX_EVENTS) {
      throw new Error(
        `Events has ${parsed.length} entries; the Conversions API accepts at most ${MAX_EVENTS} per request`,
      );
    }

    const mode = input.hashing ?? "auto";
    const data: ServerEvent[] = [];
    for (const [index, event] of parsed.entries()) {
      data.push(await prepareEvent(event, mode, index));
    }

    ctx.log("info", "sending conversion event batch", {
      dataset: datasetId,
      count: data.length,
    });

    const body: Record<string, unknown> = { data };
    if (input.testEventCode) body.test_event_code = input.testEventCode;

    const client = new ConversionsClient(ctx);
    return await client.request<ConversionsResponse>(`/${datasetId}/events`, {
      method: "POST",
      body,
    });
  },
};

export default sendEvents;
