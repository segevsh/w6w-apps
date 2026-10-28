import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient } from "../lib/client.ts";

interface Input {
  displayName: string;
  description?: string;
  guidelines?: string;
  spaceHistoryState?: "HISTORY_OFF" | "HISTORY_ON";
  externalUserAllowed?: boolean;
  predefinedPermissionSettings?: "COLLABORATION_SPACE" | "ANNOUNCEMENT_SPACE";
}

interface SpacePayload {
  displayName: string;
  spaceType: "SPACE";
  spaceDetails?: { description?: string; guidelines?: string };
  spaceHistoryState?: string;
  externalUserAllowed?: boolean;
  predefinedPermissionSettings?: string;
}

/**
 * `spaces.create` — POST /v1/spaces
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/create
 *
 * With user authentication this creates a *named* space, so `spaceType` is
 * pinned to `SPACE` rather than exposed: `GROUP_CHAT` and `DIRECT_MESSAGE` are
 * not creatable here — use Set Up Space for those. `spaceType` is documented
 * "Output only" on the Space resource but is the one exception the create
 * method reads from the request body.
 *
 * `requestId` is filled from `ctx.invocation.invocationId`, which is what makes
 * this idempotent: Google returns the space already created with that id instead
 * of minting a second one.
 */
const createSpace: ActionDefinition<Input> = {
  key: "create-space",
  type: "perform",
  resource: "space",
  title: "Create Space",
  description:
    "Create a named space. The authenticated user becomes its manager. Use Set Up Space to create a group chat or DM, or to add members at creation time.",
  // Deduplicated server-side by `requestId` (the invocation id), so a retry
  // returns the same space rather than a second one.
  idempotent: true,
  params: [
    {
      key: "displayName",
      label: "Space name",
      type: "string",
      required: true,
      hint: "Maximum 128 characters. Must be unique among the spaces the caller belongs to.",
      validation: { maxLength: 128 },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Maximum 150 characters.",
      validation: { maxLength: 150 },
    },
    {
      key: "guidelines",
      label: "Guidelines",
      type: "text",
      hint: "Space rules and expectations. Maximum 5,000 characters.",
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
      hint: "Follows the Workspace organisation default when omitted.",
    },
    {
      key: "externalUserAllowed",
      label: "Allow external users",
      type: "boolean",
      hint:
        "Immutable once the space is created. Only settable when creating a space in a Workspace organisation.",
    },
    {
      key: "predefinedPermissionSettings",
      label: "Permission preset",
      type: "select",
      options: [
        { value: "COLLABORATION_SPACE", label: "Collaboration space — everyone can post" },
        { value: "ANNOUNCEMENT_SPACE", label: "Announcement space — only managers can post" },
      ],
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "spaceType", type: "string", label: "Space type" },
    { key: "spaceUri", type: "string", label: "Link to the space" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    const body: SpacePayload = { displayName: input.displayName, spaceType: "SPACE" };
    if (input.description !== undefined || input.guidelines !== undefined) {
      body.spaceDetails = { description: input.description, guidelines: input.guidelines };
    }
    if (input.spaceHistoryState !== undefined) body.spaceHistoryState = input.spaceHistoryState;
    if (input.externalUserAllowed !== undefined) {
      body.externalUserAllowed = input.externalUserAllowed;
    }
    if (input.predefinedPermissionSettings !== undefined) {
      body.predefinedPermissionSettings = input.predefinedPermissionSettings;
    }

    return await client.request(`/spaces`, {
      method: "POST",
      body,
      query: { requestId: ctx.invocation?.invocationId },
    });
  },
};

export default createSpace;
