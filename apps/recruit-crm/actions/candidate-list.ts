import { listAction } from "../lib/params.ts";

export default listAction({
  key: "candidate-list",
  resource: "candidate",
  title: "List Candidates",
  description: "List candidates, one page at a time (`GET /v1/candidates`).",
  path: "/candidates",
});
