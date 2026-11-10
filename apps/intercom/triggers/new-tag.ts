import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import tagGetMany from "../actions/tag-get-many.ts";

interface Tag {
  id?: string;
  name?: string;
}

/**
 * `GET /tags` returns every tag of the workspace in one response (the endpoint takes no paging
 * parameters, https://developers.intercom.com/docs/references/rest-api/api.intercom.io/tags/listtags,
 * verified 2026-11-10), so each check diffs the tag ids against the previous check
 * (`pollSnapshot`, added only: a rename must not read as a new tag).
 */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "Fires when a tag is created in the workspace. The run gets the tag (id and name).",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { type: "tag", id: "81234", name: "VIP" },
  async poll({ state }, ctx) {
    const result = await tagGetMany.execute({}, ctx) as { data?: Tag[] };
    const tags = (result?.data ?? []).filter((t) => t.id !== undefined && t.id !== "");
    const byId = new Map(tags.map((t) => [String(t.id), t]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: tags.map((t) => ({ key: String(t.id), values: { id: t.id } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default trigger;
