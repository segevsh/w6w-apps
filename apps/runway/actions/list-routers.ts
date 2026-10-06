import { listAction } from "../lib/reads.ts";

/** `GET /v1/routers`. */
export default listAction(
  "list-routers",
  "List Model Routers",
  "List saved Model Router configurations: slug, optimization preference and model rules.",
  "router",
  "/v1/routers",
  "routers",
);
