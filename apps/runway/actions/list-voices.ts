import { listAction } from "../lib/reads.ts";

/** `GET /v1/voices` — custom voices (PROCESSING, READY with `previewUrl`, or FAILED). */
export default listAction(
  "list-voices",
  "List Custom Voices",
  "List the organization's custom voices, with status and preview URL.",
  "voice",
  "/v1/voices",
  "voices",
);
