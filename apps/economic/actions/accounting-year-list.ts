import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "accounting-year-list",
  resource: "accounting-year",
  title: "List Accounting Years",
  description: "List accounting years; the year is the key for entries.",
  path: "/accounting-years",
});
