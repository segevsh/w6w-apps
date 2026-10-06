import type { ActionDefinition } from "@w6w/types";
import { kt, list } from "../lib/client.ts";

interface Input {
  tagId: number;
  status?: string[] | string;
  bounceStatus?: string[] | string;
}

/** Return the contacts carrying a tag, with the time each got it. */
const subscriberTagged: ActionDefinition<Input> = {
  key: "subscriber-tagged",
  type: "search",
  resource: "subscriber",
  title: "List Contacts with Tag",
  description: "Return the contacts carrying a tag, with the time each got it.",
  params: [
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
      hint: "A manual tag from List Tags, or a smart tag ID taken from Get Contact.",
    },
    {
      key: "status",
      label: "Subscription status",
      type: "multiselect",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "pending", label: "Pending" },
        { value: "unsubscribed", label: "Unsubscribed" },
      ],
      hint: "Defaults to subscribed only.",
    },
    {
      key: "bounceStatus",
      label: "Bounce status",
      type: "multiselect",
      options: [
        { value: "hardbounce", label: "Hard bounce" },
        { value: "softbounce", label: "Soft bounce" },
        { value: "spambounce", label: "Spam bounce" },
        { value: "nobounce", label: "No bounce" },
      ],
      hint: "Defaults to soft, spam and no bounce.",
    },
  ],
  output: [
    {
      key: "subscribers",
      type: "array",
      label: "Contacts: { subscriberId, taggedAt (Unix seconds) }",
    },
  ],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-tagged");
    const map = await kt(ctx, "POST", "/subscriber/tagged", {
      body: {
        tagid: Number(input.tagId),
        // The schema marks both filters required; the documented defaults are sent explicitly.
        status: list(input.status, ["subscribed"]),
        bounceStatus: list(input.bounceStatus, ["softbounce", "spambounce", "nobounce"]),
      },
    }) as Record<string, string>;
    const subscribers = Object.entries(map).map(([subscriberId, taggedAt]) => ({
      subscriberId,
      taggedAt: Number(taggedAt),
    }));
    return { subscribers };
  },
};

export default subscriberTagged;
