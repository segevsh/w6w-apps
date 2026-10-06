import { listAction, pagingParams } from "../lib/factory.ts";

/** `GET /v4/suppressions` */
export default listAction({
  key: "suppression-list",
  title: "List Suppressions",
  description: "List suppressed addresses (bounces, complaints, unsubscribes) with the reason.",
  resource: "suppression",
  path: "/suppressions",
  params: pagingParams,
});
