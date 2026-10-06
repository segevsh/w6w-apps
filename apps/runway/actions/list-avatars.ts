import { listAction } from "../lib/reads.ts";

/** `GET /v1/avatars`. */
export default listAction(
  "list-avatars",
  "List Avatars",
  "List the Characters avatars: personality, voice, reference image and status.",
  "avatar",
  "/v1/avatars",
  "avatars",
);
