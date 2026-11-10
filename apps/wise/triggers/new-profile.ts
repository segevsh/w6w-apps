import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import profileList from "../actions/profile-list.ts";

/**
 * `profile-list`: `GET /profiles` lists the personal and business profiles the token can act as in
 * one response (https://docs.wise.com/api-reference/profile, verified 2026-11-10); a user has a
 * handful. Additions only.
 */
const trigger: TriggerDefinition = {
  key: "new-profile",
  title: "New Profile",
  description:
    "The run gets each Wise profile (personal or business) the connection newly gains access to.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Profile ID" },
    { key: "values", type: "object", label: "Profile" },
  ],
  sample: {
    change: "added",
    key: "222",
    values: { id: 222, type: "BUSINESS" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await profileList.execute({}, ctx) as {
      items?: Array<{ id?: number | string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.items ?? []).flatMap((p) =>
        p.id !== undefined && p.id !== null ? [{ key: String(p.id), values: p }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
