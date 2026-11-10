import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

interface State {
  cursor?: string;
}
const initialCursor = "1970-01-01T00:00:00Z";
export const clock = { now: (): number => Date.now() };

async function check(state: unknown, ctx: HookContext) {
  const cursor = typeof (state as State)?.cursor === "string"
    ? (state as State).cursor!
    : initialCursor;
  const result = await pollNewItems<unknown>({
    state,
    maxPages: 1,
    maxEvents: 100,
    seenWindow: 200,
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    async fetchPage() {
      const page = await contactList.execute({ createdAfter: cursor, perPage: 100 }, ctx) as {
        data?: unknown[];
      };
      return { items: page.data ?? [] };
    },
  });
  return {
    events: result.events,
    nextState: { ...result.nextState, cursor: new Date(clock.now()).toISOString() },
  };
}

const trigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check(state, ctx),
};
export default trigger;
