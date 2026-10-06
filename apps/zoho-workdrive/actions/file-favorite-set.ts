import type { ActionDefinition } from "@w6w/types";
import { patchFile, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  favorite: boolean;
}

/**
 * `PATCH /files/{resource_id}` with `attributes.favorite`. The "mark as favorite" page's own
 * parameter hint says `true` "removes" the file from favorites — a copy-paste slip; the
 * "remove from favorites" page uses `favorite:false`, so `true` marks and `false` removes.
 */
const fileFavoriteSet: ActionDefinition<Input> = {
  key: "file-favorite-set",
  type: "perform",
  resource: "file",
  title: "Set Favorite",
  description: "Mark a file or folder as a favorite, or remove it from favorites.",
  idempotent: true,
  params: [
    resourceId,
    { key: "favorite", label: "Favorite", type: "boolean", required: true, default: true },
  ],
  output: [{ key: "item", type: "object", label: "Updated resource (JSON:API `data`)" }],

  execute(input, ctx) {
    return patchFile(new WorkDriveClient(ctx), input.resourceId, {
      favorite: input.favorite !== false,
    });
  },
};

export default fileFavoriteSet;
