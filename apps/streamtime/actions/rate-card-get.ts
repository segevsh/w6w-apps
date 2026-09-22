import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /rate_cards/{rate_card_id}` — one rate card. */
interface Input {
  rateCardId: number;
}

const rateCardGet: ActionDefinition<Input> = {
  key: "rate-card-get",
  type: "read",
  resource: "rate-card",
  title: "Get Rate Card",
  description: "Fetch one rate card by id.",
  params: [idParam("rateCardId", "Rate Card ID", "Ids come from List Rate Cards.")],
  output: [
    { key: "id", type: "number", label: "Rate card ID" },
    { key: "name", type: "string", label: "Rate card name" },
    { key: "currency", type: "object", label: "Currency — `{ id, name, symbol }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/rate_cards/${encodeId(input.rateCardId)}`);
  },
};

export default rateCardGet;
