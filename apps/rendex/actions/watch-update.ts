import type { ActionDefinition } from "@w6w/types";
import { encodeId, RendexClient } from "../lib/client.ts";
import { WATCH_OUTPUT, WATCH_PARAMS, watchBody, type WatchInput } from "../lib/watch.ts";

/**
 * `PATCH /v1/watches/{id}` — update, pause (`paused: true`), resume (`paused: false`) or change
 * the URL. The API also accepts null on `webhookUrl`/`notifyEmail` to switch a channel off;
 * a blank param here means "leave unchanged", so this action cannot clear one (see README).
 */
interface Input extends WatchInput {
  watchId: string;
}

const watchUpdate: ActionDefinition<Input> = {
  key: "watch-update",
  type: "perform",
  idempotent: true,
  resource: "watch",
  title: "Update Watch",
  description: "Change a watch's settings, or pause or resume it. Only the fields you set change.",
  params: [
    { key: "watchId", label: "Watch ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string", hint: "Set to point the watch at a new URL." },
    {
      key: "paused",
      label: "Paused",
      type: "boolean",
      hint: "true pauses, false resumes (resuming takes a new baseline: 1 credit).",
    },
    ...WATCH_PARAMS,
  ],
  output: [...WATCH_OUTPUT],

  execute(input, ctx) {
    const id = encodeId(input.watchId);
    if (!id) throw new Error("Watch ID is required");
    const body = watchBody(input);
    if (Object.keys(body).length === 0) throw new Error("Set at least one field to update");
    return new RendexClient(ctx).json(`/watches/${id}`, { method: "PATCH", body });
  },
};

export default watchUpdate;
