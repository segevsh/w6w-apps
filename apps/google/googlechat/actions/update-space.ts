import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName } from "../lib/client.ts";

interface Input {
  space: string;
  updateMask: string;
  displayName?: string;
  description?: string;
  guidelines?: string;
  spaceHistoryState?: "HISTORY_OFF" | "HISTORY_ON";
}

interface SpacePayload {
  displayName?: string;
  spaceDetails?: { description?: string; guidelines?: string };
  spaceHistoryState?: string;
}

/**
 * `spaces.patch` — PATCH /v1/{space.name=spaces/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/patch
 *
 * `updateMask` is **required** by Google, not optional, and it names *snake_case*
 * field paths (`space_details`, `display_name`, `space_history_state`) even
 * though the body is camelCase. Two of Google's rules are worth restating:
 * `space_details` updates description *and* guidelines together — omitting one
 * clears it, so pass both — and `display_name` only applies to a space whose
 * `spaceType` is `SPACE`.
 */
const updateSpace: ActionDefinition<Input> = {
  key: "update-space",
  type: "perform",
  resource: "space",
  title: "Update Space",
  description:
    "Rename a space or change its description, guidelines or history setting. `updateMask` selects which fields are written.",
  // Writing the same field paths to the same values converges on the same state.
  idempotent: true,
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "updateMask",
      label: "Update mask",
      type: "string",
      required: true,
      hint:
        "Comma-separated snake_case field paths. Supported here: `display_name`, `space_details`, `space_history_state`.",
      placeholder: "display_name,space_details",
    },
    {
      key: "displayName",
      label: "Space name",
      type: "string",
      hint: "Only writable on a named space (`spaceType` = SPACE).",
      validation: { maxLength: 128 },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint:
        "Part of `space_details`. Pass the existing guidelines alongside it or they are cleared.",
      validation: { maxLength: 150 },
    },
    {
      key: "guidelines",
      label: "Guidelines",
      type: "text",
      hint: "Part of `space_details`. Pass the existing description alongside it or it is cleared.",
      validation: { maxLength: 5000 },
    },
    {
      key: "spaceHistoryState",
      label: "History",
      type: "select",
      options: [
        { value: "HISTORY_ON", label: "History on" },
        { value: "HISTORY_OFF", label: "History off" },
      ],
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "spaceDetails", type: "object", label: "Description and guidelines" },
    { key: "spaceHistoryState", type: "string", label: "History state" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    const body: SpacePayload = {};
    if (input.displayName !== undefined) body.displayName = input.displayName;
    if (input.description !== undefined || input.guidelines !== undefined) {
      body.spaceDetails = { description: input.description, guidelines: input.guidelines };
    }
    if (input.spaceHistoryState !== undefined) body.spaceHistoryState = input.spaceHistoryState;

    return await client.request(`/${spaceName(input.space)}`, {
      method: "PATCH",
      body,
      query: { updateMask: input.updateMask },
    });
  },
};

export default updateSpace;
