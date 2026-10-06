import { getAction } from "../lib/actions.ts";

export default getAction({
  "key": "estimate-get",
  "noun": "estimate",
  "path": "/estimates",
  "scope": "estimates.read",
  "resultKey": "estimate",
});
