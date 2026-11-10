import type { Param } from "@w6w/types";
import { requireParam, webhookTrigger } from "../lib/triggers.ts";

const MENTIONED: Param = {
  key: "mentionedId",
  label: "User or group ID",
  type: "string",
  required: true,
  hint: "The member (List Users) or group (List Groups) whose mentions start the workflow.",
};

const MENTIONED_TYPE: Param = {
  key: "mentionedType",
  label: "Is a",
  type: "select",
  required: true,
  default: "USER",
  options: [
    { value: "USER", label: "Member" },
    { value: "GROUP", label: "Group" },
  ],
};

const CHANNELS: Param = {
  key: "channelIds",
  label: "Only in these channels",
  type: "string",
  hint: "Comma-separated channel ids. Leave empty for every channel.",
};

/** A member or group is mentioned in a thread or comment (action `MENTION`, filter `userSelection`). */
const mention = webhookTrigger({
  key: "mention",
  title: "Member or Group Mentioned",
  description:
    "Fires when the chosen member or group is mentioned in a thread or comment (action MENTION), optionally only in some channels. The run gets who was mentioned, who mentioned them and where (a thread or a comment).",
  action: "MENTION",
  params: [MENTIONED, MENTIONED_TYPE, CHANNELS],
  filter: (p) => {
    const f: Record<string, unknown> = {
      userSelection: [{
        id: requireParam(p, "mentionedId", "member or group ID"),
        type: p.mentionedType === "GROUP" ? "GROUP" : "USER",
      }],
    };
    if (typeof p.channelIds === "string") {
      const ids = p.channelIds.split(",").map((c) => c.trim()).filter((c) => c !== "");
      if (ids.length > 0) f.channelIDs = ids;
    }
    return f;
  },
  output: [
    { key: "mentionedUsers", type: "array", label: "Mentioned members and groups — [{id, type}]" },
    { key: "userID", type: "string", label: "User ID of whoever mentioned them" },
    {
      key: "source",
      type: "object",
      label: "Where — {type: THREAD|COMMENT, channelID, threadID, commentID?}",
    },
  ],
  sample: {
    action: "MENTION",
    mentionedUsers: [{ id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601", type: "USER" }],
    userID: "0f4a9c1e-2b7d-4e63-9a58-3d1c7b2e8f90",
    source: {
      type: "COMMENT",
      channelID: "9e455d01-82d8-41a4-a176-fa4d9462e08b",
      threadID: "5dbcf5c9-5e7e-4285-9dab-6d3ce7f4dd1e",
      commentID: "7c1d3e52-6d2a-4c58-8f0e-2a9b6f1d3c44",
    },
  },
});

export default mention;
