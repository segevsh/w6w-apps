import { getAction } from "../lib/reads.ts";

/** `GET /v1/avatars/{id}`. */
export default getAction(
  "get-avatar",
  "Get Avatar",
  "Read one avatar: personality, voice, knowledge documents and status.",
  "avatar",
  "/v1/avatars",
  "avatar",
  "Avatar ID",
);
