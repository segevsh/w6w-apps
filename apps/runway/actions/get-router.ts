import { getAction } from "../lib/reads.ts";

/** `GET /v1/routers/{id}`. */
export default getAction(
  "get-router",
  "Get Model Router",
  "Read one Model Router configuration.",
  "router",
  "/v1/routers",
  "router",
  "Router ID",
);
