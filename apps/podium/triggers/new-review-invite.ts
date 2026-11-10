import reviewInviteList from "../actions/review-invite-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new review invite, newest first (`GET /v4/reviews/invites`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-review-invite",
  title: "New Review Invite",
  description: "The run gets each new review invite, newest first (`GET /v4/reviews/invites`).",
  action: reviewInviteList,
  output: [{ key: "uid", type: "string", label: "UID" }, {
    key: "createdAt",
    type: "string",
    label: "Created at",
  }],
  sample: { uid: "invite_1", createdAt: "2026-11-10T12:00:00.000Z" },
});
