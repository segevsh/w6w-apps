import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/subscription/edit` (zone 2). Parameters: `ac` (`edit`, `subscribe` or
 * `unsubscribe`), `s` (stream id), `t` (new title; omit to keep it), `a` (add to folder, full
 * name like `user/-/label/Tech`), `r` (remove from folder). Answers the plain body `OK`.
 *
 * The vendor says `subscribe` can also rename and file a feed in one call.
 */
interface Input {
  action: "edit" | "subscribe" | "unsubscribe";
  streamId: string;
  title?: string;
  addToFolder?: string;
  removeFromFolder?: string;
}

const subscriptionEdit: ActionDefinition<Input> = {
  key: "subscription-edit",
  type: "perform",
  resource: "subscriptions",
  title: "Edit Subscription",
  description: "Rename a feed, move it between folders, follow it, or unfollow it.",
  idempotent: true,
  params: [
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "edit",
      options: [
        { value: "edit", label: "Edit (rename / change folders)" },
        { value: "subscribe", label: "Subscribe (optionally rename and file)" },
        { value: "unsubscribe", label: "Unsubscribe" },
      ],
    },
    {
      key: "streamId",
      label: "Feed stream ID",
      type: "string",
      required: true,
      placeholder: "feed/http://feeds.arstechnica.com/arstechnica/science",
    },
    {
      key: "title",
      label: "New title",
      type: "string",
      hint: "Leave empty to keep the title unchanged.",
    },
    {
      key: "addToFolder",
      label: "Add to folder",
      type: "string",
      placeholder: "user/-/label/Tech",
      hint: "Full folder name, `user/-/label/<name>`.",
    },
    {
      key: "removeFromFolder",
      label: "Remove from folder",
      type: "string",
      placeholder: "user/-/label/Tech",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Inoreader confirmed with OK" }],

  async execute(input, ctx) {
    const ac = input.action ?? "edit";
    if (!["edit", "subscribe", "unsubscribe"].includes(ac)) {
      throw new Error(`action must be edit, subscribe or unsubscribe (got ${ac})`);
    }
    const s = (input.streamId ?? "").trim();
    if (!s) throw new Error("streamId is required");
    await new InoreaderClient(ctx).ok("/subscription/edit", {
      query: {
        ac,
        s,
        t: input.title?.trim(),
        a: input.addToFolder?.trim(),
        r: input.removeFromFolder?.trim(),
      },
    });
    return { ok: true };
  },
};

export default subscriptionEdit;
