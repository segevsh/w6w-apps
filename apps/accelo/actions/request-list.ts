import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "request-list",
  resource: "request",
  path: "/requests",
  title: "List Requests",
  description: "List requests (inbound client requests).",
});
