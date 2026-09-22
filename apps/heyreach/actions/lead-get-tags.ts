import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { profileUrlParam } from "../lib/params.ts";

interface Input {
  profileUrl: string;
}

/**
 * `POST /api/public/lead/GetTags` — the tags currently on a lead.
 *
 * The request is documented (`{ profileUrl }`, POST body) and the operation's
 * prose says the tags come back alphabetically sorted — but the **200 schema in
 * the document is empty** (`{"type":"object","properties":{}}`), so the response
 * shape is not published. This action therefore returns the body exactly as
 * HeyReach served it, unmodified, rather than inventing an envelope for it: a
 * caller that has a live response can read the field, and nothing here can be
 * wrong about a shape the vendor never stated.
 *
 * `lead-add-tags` is the write side of the same tags, and its
 * `newAssignedTags` response *is* documented.
 */
const action: ActionDefinition<Input> = {
  key: "lead-get-tags",
  type: "read",
  resource: "lead",
  title: "Get Tags for Lead",
  description:
    "Read the tags on a lead. HeyReach's document publishes no response schema for this " +
    "operation, so the body is returned verbatim (POST /api/public/lead/GetTags).",
  params: [profileUrlParam],
  output: [{ key: "tags", type: "array", label: "Tags, as HeyReach returns them" }],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/lead/GetTags", {
      method: "POST",
      body: { profileUrl: input.profileUrl },
    });
  },
};

export default action;
