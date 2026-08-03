import type { ActionDefinition } from "@w6w/types";
import { TickTickClient, ticktickDate } from "../lib/client.ts";
import { arrayOutput, focusTypeParam } from "../lib/params.ts";

interface Input {
  from: string;
  to: string;
  type: number;
}

/**
 * `GET /open/v1/focus?from=&to=&type=` — focus records in a time range.
 *
 * All three parameters are **required**, which is unusual enough to note: there
 * is no "recent focuses" call, and no way to ask for both pomodoro and timing
 * records in one request — the two types are separate queries.
 *
 * **The range is silently clamped.** TickTick's own note: "If the time range
 * exceeds 30 days, the server automatically adjusts the start time to 30 days
 * before `to`." So a 90-day request does not fail — it returns 30 days of data
 * and says nothing. A caller wanting a longer history has to page by hand
 * through 30-day windows, and this action does not hide that behind a loop,
 * because a silent truncation dressed up as a complete answer is worse than an
 * honest window.
 *
 * Dates go out in the documented `yyyy-MM-ddTHH:mm:ss+0000` form.
 */
const listFocuses: ActionDefinition<Input, { items: unknown[]; count: number }> = {
  key: "list-focuses",
  type: "search",
  resource: "focus",
  title: "List Focuses",
  description:
    "List focus records (pomodoro or timing sessions) in a time range. TickTick clamps any range longer than 30 days to the last 30 days before the end, without warning.",
  params: [
    {
      key: "from",
      label: "From",
      type: "datetime",
      required: true,
      hint: "Range start. TickTick silently moves this forward if the range exceeds 30 days.",
    },
    { key: "to", label: "To", type: "datetime", required: true, hint: "Range end." },
    focusTypeParam,
  ],
  output: arrayOutput("Focus records"),

  async execute(input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/focus", {
      query: {
        from: ticktickDate(input.from),
        to: ticktickDate(input.to),
        type: input.type,
      },
    });
    return { items, count: items.length };
  },
};

export default listFocuses;
