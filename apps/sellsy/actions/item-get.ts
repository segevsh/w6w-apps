import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "item-get",
  "noun": "item",
  "path": "/items",
  "scope": "items.read",
  "resultKey": "item",
});
