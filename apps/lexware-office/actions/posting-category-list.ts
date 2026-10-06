import { listAction } from "../lib/factory.ts";

/** `GET /v1/posting-categories` — bare array of `{id, name, type, contactRequired, splitAllowed, groupName}`. */
export default listAction({
  key: "posting-category-list",
  title: "List Posting Categories",
  description: "Posting categories (income and outgo) usable on bookkeeping vouchers.",
  resource: "posting-category",
  path: "/posting-categories",
  paged: false,
});
