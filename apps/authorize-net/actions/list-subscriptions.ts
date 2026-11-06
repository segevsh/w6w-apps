import { requestAction } from "../lib/actions.ts";

export default requestAction({
  "key": "list-subscriptions",
  "title": "List Subscriptions",
  "description":
    "List subscriptions matching a status search type. Returns one page using paging.limit and one-based paging.offset.",
  "resource": "subscription",
  "type": "search",
  "request": "ARBGetSubscriptionListRequest",
  "params": [
    {
      "key": "searchType",
      "label": "Search type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "cardExpiringThisMonth",
          "label": "cardExpiringThisMonth",
        },
        {
          "value": "subscriptionActive",
          "label": "subscriptionActive",
        },
        {
          "value": "subscriptionExpiringThisMonth",
          "label": "subscriptionExpiringThisMonth",
        },
        {
          "value": "subscriptionInactive",
          "label": "subscriptionInactive",
        },
      ],
    },
    {
      "key": "sorting",
      "label": "Sorting",
      "type": "json",
      "hint": "Sorting object with orderBy and orderDescending.",
    },
    {
      "key": "paging",
      "label": "Paging",
      "type": "json",
      "hint": 'One page per call. {"limit":100,"offset":1}; offset is a one-based page number.',
    },
  ],
  "output": [
    {
      "key": "refId",
      "type": "string",
      "label": "Reference ID",
    },
    {
      "key": "messages",
      "type": "object",
      "label": "Messages",
    },
    {
      "key": "sessionToken",
      "type": "string",
      "label": "Session token",
    },
    {
      "key": "totalNumInResultSet",
      "type": "number",
      "label": "Total num in result set",
    },
    {
      "key": "subscriptionDetails",
      "type": "array",
      "label": "Subscription details",
    },
  ],
});
