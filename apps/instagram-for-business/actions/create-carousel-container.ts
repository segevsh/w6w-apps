import type { ActionDefinition } from "@w6w/types";
import { csv, InstagramClient, jsonParam, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  children: string | string[];
  caption?: string;
  locationId?: string;
  collaborators?: string | string[];
  isAiGenerated?: boolean;
}

/**
 * Publishing step 1 for a carousel — `POST /{ig-user-id}/media` with
 * `media_type=CAROUSEL` and `children` set to the comma-separated container ids of
 * up to 10 images/videos previously created with `isCarouselItem` on. Reels cannot
 * appear in a carousel. A published carousel counts as ONE post against the daily
 * publishing limit. Not `idempotent`.
 */
const createCarouselContainer: ActionDefinition<Input, { id: string }> = {
  key: "create-carousel-container",
  type: "perform",
  resource: "media",
  title: "Create Carousel Container",
  description: "Publishing step 1 for a carousel: bundle up to 10 item containers into one post.",
  idempotent: false,
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "children",
      label: "Item container IDs",
      type: "string",
      required: true,
      hint: "Comma-separated container ids, at most 10, each made with “Carousel item” on.",
    },
    { key: "caption", label: "Caption", type: "text" },
    { key: "locationId", label: "Location Page ID", type: "string" },
    {
      key: "collaborators",
      label: "Collaborators",
      type: "string",
      hint: "Up to 3 usernames, comma-separated.",
    },
    {
      key: "isAiGenerated",
      label: "AI-generated",
      type: "boolean",
      hint: "Set on the carousel container only, never on its children.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Carousel container ID" }],

  async execute(input, ctx) {
    const children = csv(input.children);
    if (!children) throw new Error("children must list at least one container id");
    if (children.split(",").length > 10) throw new Error("a carousel holds at most 10 items");

    return await new InstagramClient(ctx).request<{ id: string }>(`/${seg(input.igUserId)}/media`, {
      method: "POST",
      params: {
        media_type: "CAROUSEL",
        children,
        caption: input.caption,
        location_id: input.locationId,
        collaborators: jsonParam(csv(input.collaborators)?.split(",")),
        is_ai_generated: input.isAiGenerated,
      },
    });
  },
};

export default createCarouselContainer;
