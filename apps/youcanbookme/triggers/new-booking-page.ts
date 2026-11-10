import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listProfiles from "../actions/list-profiles.ts";

const trigger: TriggerDefinition = {
  key: "new-booking-page",
  title: "New Booking Page",
  description: "The run gets each booking page newly created for an account.",
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Booking page ID" }],
  sample: { id: "profile-sample", title: "Consultations" },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const out = await listProfiles.execute(
      { accountId: String(params.accountId ?? "") },
      ctx,
    ) as unknown[];
    const rows = out.map((value) => ({
      key: String((value as { id?: unknown }).id ?? ""),
      values: value,
    }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((event) => event.values), nextState };
  },
};

export default trigger;
