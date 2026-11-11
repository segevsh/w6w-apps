import cardList from "../actions/card-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/cards` has no sort or since filter, so every check reads all cards (`limit` 1000,
 * `cursor` paging, at most 5000 cards) and diffs the ids.
 * https://developer.brex.com/openapi/team_api/cards/listcardsbyuserid.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-card",
  title: "New Card",
  description: "The run gets each card newly issued in your Brex account.",
  action: cardList,
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "owner", type: "object", label: "Owner" },
    { key: "status", type: "string", label: "Status" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type" },
    { key: "limit_type", type: "string", label: "Limit type" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "cuard_sample0001",
    owner: { type: "USER", user_id: "cuuser_sample0001" },
    status: "ACTIVE",
    last_four: "0000",
    card_name: "Sample card",
    card_type: "VIRTUAL",
    limit_type: "CARD",
    created_at: "2026-11-10T09:00:00.000Z",
  },
});
