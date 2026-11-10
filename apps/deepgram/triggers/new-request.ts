import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import requestList from "../actions/request-list.ts";

export const clock = { now: (): number => Date.now() };

const trigger: TriggerDefinition = {
  key: "new-request",
  title: "New Request",
  description: "The run gets each newly recorded Deepgram API request.",
  params: [],
  output: [{ key: "request_id", type: "string", label: "Request ID" }],
  sample: { request_id: "req_123" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const prior = state as { cursor?: unknown };
    const cursor = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
    const response = await requestList.execute({
      start: new Date(cursor - 120_000).toISOString(),
      end: new Date(checkedAt).toISOString(),
      limit: 100,
      page: 0,
    }, ctx) as { requests?: unknown[] };
    const polled = await pollNewItems({
      state,
      maxPages: 1,
      maxEvents: 100,
      idOf: (item) =>
        String(
          (item as { request_id?: unknown; id?: unknown }).request_id ??
            (item as { id?: unknown }).id ?? "",
        ),
      fetchPage: () => Promise.resolve({ items: response.requests ?? [] }),
    });
    return { ...polled, nextState: { ...polled.nextState, cursor: checkedAt } };
  },
};

export default trigger;
