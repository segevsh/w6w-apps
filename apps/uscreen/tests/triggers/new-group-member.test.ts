import trigger from "../../triggers/new-group-member.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite(
  "new-group-member",
  trigger,
  "https://uscreen.io/publisher_api/v1/groups/7/members",
  "created_at",
  {
    params: { groupId: 7 },
  },
);
