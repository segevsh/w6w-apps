import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "request-get",
  resource: "request",
  path: "/requests",
  idKey: "requestId",
  idLabel: "Request ID",
  title: "Get Request",
  description: "Fetch one request by id.",
});
