import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/subscription/quickadd` (zone 2) — follow a feed. Parameter `quickadd` is a
 * feed id such as `feed/http://feeds.arstechnica.com/arstechnica/science`.
 *
 * Unlike every other write this one answers JSON: `query`, `numResults`, `streamId`,
 * `streamName`. "numResults will be 0 if the feed is not added for some reason. It will be 1
 * when feed is added, even if the user is already subscribed." — so a `0` is surfaced as an
 * error rather than returned as a success, and the call is safe to repeat (idempotent).
 */
interface Input {
  feed: string;
}

const subscriptionAdd: ActionDefinition<Input> = {
  key: "subscription-add",
  type: "perform",
  resource: "subscriptions",
  title: "Follow Feed",
  description: "Subscribe the user to a feed. Following a feed already followed is not an error.",
  idempotent: true,
  params: [
    {
      key: "feed",
      label: "Feed",
      type: "string",
      required: true,
      placeholder: "feed/http://feeds.arstechnica.com/arstechnica/science",
      hint: "A feed id: `feed/` followed by the feed's XML URL. A bare http(s) URL is prefixed " +
        "with `feed/` for you.",
    },
  ],
  output: [
    { key: "query", type: "string", label: "Query as sent" },
    { key: "numResults", type: "number", label: "1 when added (or already followed)" },
    { key: "streamId", type: "string", label: "Stream ID of the feed" },
    { key: "streamName", type: "string", label: "Feed title" },
  ],

  async execute(input, ctx) {
    const raw = (input.feed ?? "").trim();
    if (!raw) throw new Error("feed is required");
    const quickadd = /^https?:\/\//i.test(raw) ? `feed/${raw}` : raw;
    const body = await new InoreaderClient(ctx).json<{ numResults?: number }>(
      "/subscription/quickadd",
      { method: "POST", query: { quickadd } },
    );
    if (!body.numResults) {
      throw new Error(`Inoreader did not add the feed (numResults ${body.numResults ?? 0})`);
    }
    return body;
  },
};

export default subscriptionAdd;
