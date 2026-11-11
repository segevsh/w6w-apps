import { pagedSnapshotTrigger } from "../lib/polls.ts";
import avatarLookList from "../actions/avatar-look-list.ts";

/**
 * `GET /v3/avatars/looks?ownership=private&limit=50` (the `avatar-look-list` action): the looks
 * (outfits, poses, styles) of the account's own avatars. HeyGen documents `limit` as 1–50 and no
 * order, so the whole list is diffed.
 */
const newAvatarLook = pagedSnapshotTrigger({
  key: "new-avatar-look",
  title: "New Avatar Look",
  description:
    "The run gets each look (outfit, pose or style) newly added to the account's own HeyGen avatars; the look id is the avatar id to pass when creating a video.",
  action: avatarLookList,
  input: (token) => ({ ownership: "private" as const, limit: 50, token }),
  maxPages: 20,
  output: [
    { key: "id", type: "string", label: "Look ID (use as avatar_id)" },
    { key: "name", type: "string", label: "Name" },
    { key: "avatar_type", type: "string", label: "Avatar type" },
    { key: "group_id", type: "string", label: "Avatar group ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "look_92b0aa",
    name: "Casual",
    avatar_type: "photo_avatar",
    group_id: "grp_41c7d9",
    gender: "female",
    status: "completed",
  },
});

export default newAvatarLook;
