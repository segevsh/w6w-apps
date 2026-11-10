import type { TriggerDefinition } from "@w6w/types";
import { pollSessions } from "../lib/snapshots.ts";

const trigger: TriggerDefinition<{ webinarKey?: string }> = {
  key: "new-session",
  title: "New Session",
  description:
    "Fires when a session of the webinar completes and appears in GoTo Webinar's list of past sessions. The run gets the session.",
  params: [{
    key: "webinarKey",
    label: "Webinar key",
    type: "string",
    required: true,
    hint: "The webinar to watch.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Session key" },
    { key: "values", type: "object", label: "Session" },
  ],
  sample: {
    change: "added",
    key: "15887209",
    values: {
      sessionKey: "15887209",
      webinarKey: "5620084814059709442",
      webinarName: "New Webinar",
      startTime: "2026-11-10T10:00:00Z",
      endTime: "2026-11-10T11:00:00Z",
    },
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const webinarKey = String(params?.webinarKey ?? "").trim();
    if (!webinarKey) throw new Error("`webinarKey` is required");
    return await pollSessions(state, webinarKey, ctx);
  },
};

export default trigger;
