import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { queryParametersParam, queryResultOutput } from "../lib/params.ts";

/**
 * `POST /api/dashboard/{dashboard-id}/dashcard/{dashcard-id}/card/{card-id}/query`
 * — run one card **as it appears on a dashboard**.
 *
 * ## Why this is not the same as running the question
 *
 * A card on a dashboard is not always the question in isolation. The dashboard
 * can add filters that wire into the card's query through `parameter_mappings`,
 * and a card can be placed with a different visualisation or a series. Running
 * the question directly via `question-run` gives the *unfiltered* answer;
 * running it through this endpoint gives the number a human actually sees on the
 * dashboard.
 *
 * That is the difference that makes this worth a separate action: "alert me when
 * the figure on the revenue dashboard drops" is a question about the dashboard's
 * view of the card, not about the card.
 *
 * ## Three ids, and two of them are easy to confuse
 *
 * The path takes all three, and `dashcardId` ≠ `cardId`:
 *
 *   - `dashboardId` — the dashboard.
 *   - `dashcardId` — the **placement**: this card, on this dashboard, in this
 *     position. It is `dashcards[].id`.
 *   - `cardId` — the **question** being placed. It is `dashcards[].card_id`.
 *
 * Verified live against the sample dashboard: dashcard `1` holds card `21`.
 * Passing the card id where the dashcard id belongs is a 404, so both params
 * name their source field explicitly. `dashboard-get` is where all three come
 * from.
 *
 * ## Same response contract as the other query actions
 *
 * HTTP **202** on success, a query-result envelope with `status`, and the same
 * body-level failure check via `client.runQuery`. Verified live: 202,
 * `status: "completed"`, `row_count: 9`.
 */
interface Input {
  dashboardId: number;
  dashcardId: number;
  cardId: number;
  parameters?: unknown;
}

const dashboardCardRun: ActionDefinition<Input> = {
  key: "dashboard-card-run",
  type: "read",
  resource: "dashboard",
  title: "Run Dashboard Card",
  description:
    "Run one card as it appears on a dashboard, with the dashboard's filters applied — not the " +
    "same as running the underlying question.",
  params: [
    {
      key: "dashboardId",
      label: "Dashboard ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "dashcardId",
      label: "Dashcard ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint:
        "The PLACEMENT id — `dashcards[].id` from Get Dashboard. This is not the question id, " +
        "and the two are usually different numbers.",
    },
    {
      key: "cardId",
      label: "Question ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The QUESTION id — `dashcards[].card_id` from Get Dashboard.",
    },
    queryParametersParam,
  ],
  output: queryResultOutput,

  execute(input, ctx) {
    const d = encodeURIComponent(String(input.dashboardId));
    const dc = encodeURIComponent(String(input.dashcardId));
    const c = encodeURIComponent(String(input.cardId));
    return new MetabaseClient(ctx).runQuery(
      `/api/dashboard/${d}/dashcard/${dc}/card/${c}/query`,
      { body: { parameters: asOptionalJson<unknown[]>(input.parameters, "Parameters") ?? [] } },
    );
  },
};

export default dashboardCardRun;
