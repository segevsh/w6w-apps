import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  creationId: string;
}

/**
 * Publishing step 2 — `POST /{ig-user-id}/media_publish?creation_id=`. Pass the id
 * of a single-media or carousel container; for video, wait for status FINISHED
 * first. Returns the id of the published media. Not `idempotent`: a container is
 * published once, and publishing counts against the account's daily limit (see Get
 * Publishing Limit). If the Page behind the account requires Page Publishing
 * Authorization, it must be completed first or the call fails.
 */
const publishContainer: ActionDefinition<Input, { id: string }> = {
  key: "publish-container",
  type: "perform",
  resource: "media",
  title: "Publish Container",
  description: "Publishing step 2: publish a finished media or carousel container.",
  idempotent: false,
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    { key: "creationId", label: "Container ID", type: "string", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Published media ID" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ id: string }>(
      `/${seg(input.igUserId)}/media_publish`,
      { method: "POST", params: { creation_id: input.creationId } },
    );
  },
};

export default publishContainer;
