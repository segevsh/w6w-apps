import type { AppDefinition } from "@w6w/types";

/** One poll trigger, so the audit's `Triggers:` line has something to count. */
export default {
  actions: [],
  triggers: [
    {
      key: "new-thing",
      title: "New Thing",
      description: "Fixture poll trigger.",
      minIntervalMs: 120000,
      poll() {
        return { events: [], nextState: {} };
      },
    },
  ],
} satisfies AppDefinition;
