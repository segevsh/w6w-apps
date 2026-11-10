import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listHabits from "../actions/list-habits.ts";
import type { TriggerDefinition } from "@w6w/types";

const trigger: TriggerDefinition = {
  key: "new-habit",
  title: "New Habit",
  description: "Detect added habits from TickTick's bounded habit collection.",
  output: [{ key: "id", type: "string", label: "Habit ID" }],
  sample: { id: "sample-habit" },
  async poll(input, ctx) {
    const result = await listHabits.execute({}, ctx);
    return await pollSnapshot({
      state: input.state,
      rows: ((result as { items?: unknown[] }).items ?? []).map((values, index) => ({
        key: String((values as { id?: unknown }).id ?? index),
        values,
      })),
      emit: { added: true, updated: false },
    });
  },
};

export default trigger;
