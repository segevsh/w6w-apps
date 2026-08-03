import type { ActionDefinition } from "@w6w/types";
import { encodeId, TickTickClient } from "../lib/client.ts";
import { focusOutput, focusTypeParam } from "../lib/params.ts";

/**
 * `GET /open/v1/focus/{focusId}?type=` — one focus record.
 *
 * A "focus" is a pomodoro session or a stopwatch ("timing") session — TickTick's
 * time-tracking side, which most task-manager integrations have no equivalent
 * of. `type` is a **required query parameter**, not a filter: a pomodoro record
 * and a timing record can carry the same id, so the type is part of the address.
 *
 * Focus ids come from **List Focuses**; there is no other source.
 *
 * See `auth/oauth2.ts` for the scope caveat that applies to every Focus and
 * Habit action: TickTick documents these endpoints but has never extended its
 * published scope list beyond `tasks:read` / `tasks:write`.
 */
const getFocus: ActionDefinition<{ focusId: string; type: number }> = {
  key: "get-focus",
  type: "read",
  resource: "focus",
  title: "Get Focus",
  description:
    "Fetch one focus record (a pomodoro or timing session) by id. The focus type is part of the address, not a filter.",
  params: [
    {
      key: "focusId",
      label: "Focus",
      type: "string",
      required: true,
      placeholder: "focus-1",
      hint: "The focus record id. Use List Focuses to find it.",
    },
    focusTypeParam,
  ],
  output: focusOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`/focus/${encodeId(input.focusId)}`, {
      query: { type: input.type },
    });
  },
};

export default getFocus;
