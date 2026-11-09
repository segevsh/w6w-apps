import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listQuestions from "../actions/list-questions.ts";

type Params = { locationId: string; ignoreAnswered?: boolean };

function questionId(item: unknown): string {
  const name = (item as { name?: unknown }).name;
  if (typeof name !== "string" || name === "") {
    throw new Error("Google Business Profile question has no name");
  }
  return name;
}

/** A question counts as new when created within this overlap of the previous cursor. */
const OVERLAP_MS = 120_000;

type Question = { name?: unknown; createTime?: unknown };

function createdMs(q: unknown): number {
  const t = Date.parse(String((q as Question).createTime ?? ""));
  return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * The list is ordered `updateTime desc`, so an old question that gains an answer or an upvote
 * rises to the top. State is the kit's seen-id window plus `cursor`: the newest `createTime`
 * (epoch ms) observed so far. An unseen question is emitted only when its `createTime` is at
 * least `cursor - 120 s`; the seen-id window dedupes the overlap. The cursor is derived from the
 * listed data, not the wall clock, so the same `(state, response)` always yields the same result.
 */
const newQuestion: TriggerDefinition<Params> = {
  key: "new-question",
  title: "New Question",
  description:
    "Polls a Business Profile location for questions created since the last check. The run gets the new question; an older question that only gained an answer or upvote is not reported.",
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "ignoreAnswered",
      label: "Only unanswered questions",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "name", label: "Question name", type: "string" },
    { key: "text", label: "Question", type: "string" },
    { key: "createTime", label: "Created time", type: "string" },
    { key: "updateTime", label: "Updated time", type: "string" },
  ],
  sample: {
    name: "locations/123/questions/456",
    text: "Do you offer delivery?",
    createTime: "2026-11-09T11:58:00Z",
    updateTime: "2026-11-09T12:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const prior = (state ?? {}) as { cursor?: unknown; seeded?: unknown };
    const seeded = prior.seeded === true && typeof prior.cursor === "number";
    const cursor = seeded ? (prior.cursor as number) : 0;
    let newest = cursor;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxPages: 1,
      idOf: questionId,
      async fetchPage() {
        const result = await (listQuestions as unknown as ActionDefinition).execute({
          locationId: params.locationId,
          ignoreAnswered: params.ignoreAnswered ?? false,
          pageSize: 10,
          orderBy: "updateTime desc",
        }, ctx) as { questions?: unknown[] };
        const all = result.questions ?? [];
        for (const q of all) {
          const t = createdMs(q);
          if (!Number.isNaN(t) && t > newest) newest = t;
        }
        if (!seeded) return { items: all };
        return {
          items: all.filter((q) => {
            const t = createdMs(q);
            return !Number.isNaN(t) && t >= cursor - OVERLAP_MS;
          }),
        };
      },
    });
    return { events, nextState: { ...nextState, cursor: newest } };
  },
};

export default newQuestion;
