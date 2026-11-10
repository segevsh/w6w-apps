import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollToken } from "../../_shared/poll/mod.ts";

/** The feed fixes its page size on the first (seeding) call; it must stay within `maxEvents`. */
export const PAGE_SIZE = 100;

interface FeedResult {
  items?: unknown[];
  cursor?: string;
}

/**
 * A change-feed poll (brief 2, `pollToken`): the first check seeds with `modifiedafter=now`, which
 * returns a cursor and no history; every later check passes the cursor back to the same
 * `*-feed` action and emits the changed records. Cloze documents the feed as returning "records ...
 * in ascending order of last change time" (https://developer.cloze.com/cloze-openapi.json).
 */
export function feedTrigger(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<Record<string, unknown>>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const feed = async (
    input: Record<string, unknown>,
    ctx: Parameters<typeof o.action.execute>[1],
  ) => {
    const res = await o.action.execute(input, ctx) as FeedResult;
    if (typeof res.cursor !== "string" || res.cursor === "") {
      throw new Error("Cloze feed answered without a cursor");
    }
    return { items: res.items ?? [], cursor: res.cursor };
  };
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    output: o.output,
    sample: o.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      return await pollToken<unknown>({
        state,
        maxEvents: PAGE_SIZE,
        seed: async () => (await feed({ modifiedafter: "now", pagesize: PAGE_SIZE }, ctx)).cursor,
        changes: async (token) => {
          const res = await feed({ cursor: token }, ctx);
          return { items: res.items, nextToken: res.cursor };
        },
      });
    },
  };
}
