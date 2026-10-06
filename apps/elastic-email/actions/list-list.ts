import { listAction, pagingParams } from "../lib/factory.ts";

/** `GET /v4/lists` */
export default listAction({
  key: "list-list",
  title: "List Lists",
  description: "List the account's contact lists (name, public id, date added).",
  resource: "list",
  path: "/lists",
  params: pagingParams,
});
