import type { Param } from "@w6w/types";
import { requireParam, webhookTrigger } from "../lib/triggers.ts";

const GROUP: Param = {
  key: "groupId",
  label: "Group ID",
  type: "string",
  required: true,
  hint: "The group to watch for new members (Get Groups lists the ids).",
};

/** A user joins a group (action `GROUP_JOIN`, filter `groupID`). */
const groupJoined = webhookTrigger({
  key: "group-joined",
  title: "Member Joined Group",
  description:
    "Fires when a user joins the chosen group, including the first time they join the community (action GROUP_JOIN). The run gets the user id and the group id.",
  action: "GROUP_JOIN",
  params: [GROUP],
  filter: (p) => ({ groupID: requireParam(p, "groupId", "group ID") }),
  output: [
    { key: "userID", type: "string", label: "User ID" },
    { key: "groupID", type: "string", label: "Group ID" },
  ],
  sample: {
    action: "GROUP_JOIN",
    userID: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    groupID: "5b2f6d0a-1c1e-4a39-9d27-0d2c2c6f4a11",
  },
});

export default groupJoined;
