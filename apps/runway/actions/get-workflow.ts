import { getAction } from "../lib/reads.ts";

/** `GET /v1/workflows/{id}` — details of one published version, including its graph. */
export default getAction(
  "get-workflow",
  "Get Workflow",
  "Read a published workflow version, including its node graph.",
  "workflow",
  "/v1/workflows",
  "workflow",
  "Workflow version ID",
);
