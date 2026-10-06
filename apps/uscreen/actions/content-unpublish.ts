import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
}

const contentUnpublish: ActionDefinition<Input> = {
  key: "content-unpublish",
  type: "perform",
  resource: "content",
  title: "Unpublish Content",
  description: "Hide a video, collection or live event from customers.",
  idempotent: true,
  params: [
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "required": true,
      "hint": "A video, collection or live event id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/contents/${seg(input.contentId)}/visibility/unpublish`,
      {},
    )) ?? {};
  },
};

export default contentUnpublish;
