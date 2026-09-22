import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /users/{user_id}/saved_segments` — the saved segments one user can see.
 *
 * The only array-valued query parameter in the API. Streamtime documents it as
 * "Provide as a JSON array in the query string", so the client serialises it as
 * `[1,2]` rather than as a repeated key — a repeated `?saved_segment_type_ids=1&…=2`
 * is a different request that the vendor does not describe.
 */
interface Input {
  userId: number;
  savedSegmentTypeIds?: number[];
}

const userSavedSegmentsList: ActionDefinition<Input> = {
  key: "user-saved-segments-list",
  type: "search",
  resource: "user",
  title: "List User Saved Segments",
  description:
    "List the saved search segments visible to one user, optionally filtered by segment type.",
  params: [
    idParam("userId", "User ID"),
    {
      key: "savedSegmentTypeIds",
      label: "Saved Segment Type IDs",
      type: "array",
      item: { type: "number", placeholder: "e.g. 3" },
      hint: "Sent as a JSON array in the query string, the way Streamtime documents it.",
    },
  ],
  output: [
    {
      key: "savedSegments",
      type: "array",
      label: "Segments — `{ id, userId, savedSegmentType, name, value }`",
    },
  ],

  async execute(input, ctx) {
    const savedSegments = await new StreamtimeClient(ctx).request<unknown[]>(
      `/users/${encodeId(input.userId)}/saved_segments`,
      { query: { saved_segment_type_ids: input.savedSegmentTypeIds } },
    );
    return { savedSegments: savedSegments ?? [] };
  },
};

export default userSavedSegmentsList;
