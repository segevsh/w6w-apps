import { getAction } from "../lib/factory.ts";

/** `GET /v4/suppressions/{email}` */
export default getAction({
  key: "suppression-get",
  title: "Get Suppression",
  description: "Look up why one address is suppressed (error code, friendly message, date).",
  resource: "suppression",
  path: "/suppressions/{id}",
  idKey: "email",
  idLabel: "Email",
  outputKey: "Email",
});
