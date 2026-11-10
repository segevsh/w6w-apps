import { pagedSnapshotTrigger } from "../lib/polls.ts";
import avatarGroupList from "../actions/avatar-group-list.ts";

/**
 * `GET /v3/avatars?ownership=private&limit=50` (the `avatar-group-list` action): the avatars the
 * account itself created or trained (`private`; the `public` preset library is reference data).
 * HeyGen documents `limit` as 1–50 and no order, so the whole list is diffed.
 */
const newAvatarGroup = pagedSnapshotTrigger({
  key: "new-avatar-group",
  title: "New Avatar",
  description:
    "The run gets each avatar (character) newly created in the HeyGen account, with its id, name and status. Preset public avatars are not included.",
  action: avatarGroupList,
  input: (token) => ({ ownership: "private" as const, limit: 50, token }),
  maxPages: 20,
  output: [
    { key: "id", type: "string", label: "Avatar group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "looks_count", type: "number", label: "Number of looks" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],
  sample: {
    id: "grp_41c7d9",
    name: "Alex",
    gender: "female",
    looks_count: 1,
    status: "completed",
    created_at: 1762776000,
  },
});

export default newAvatarGroup;
