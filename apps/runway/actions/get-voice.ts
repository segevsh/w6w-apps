import { getAction } from "../lib/reads.ts";

/** `GET /v1/voices/{id}`. */
export default getAction(
  "get-voice",
  "Get Custom Voice",
  "Read one custom voice: status, description and preview URL.",
  "voice",
  "/v1/voices",
  "voice",
  "Voice ID",
);
