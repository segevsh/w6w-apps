import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import meGet from "./actions/me-get.ts";
import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberFindByEmail from "./actions/member-find-by-email.ts";
import memberCreate from "./actions/member-create.ts";
import memberUpdate from "./actions/member-update.ts";
import spaceList from "./actions/space-list.ts";
import spaceGet from "./actions/space-get.ts";
import spaceCreate from "./actions/space-create.ts";
import spaceMemberList from "./actions/space-member-list.ts";
import spaceMemberAdd from "./actions/space-member-add.ts";
import spaceMemberRemove from "./actions/space-member-remove.ts";
import postList from "./actions/post-list.ts";
import postGet from "./actions/post-get.ts";
import postCreate from "./actions/post-create.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventUpdate from "./actions/event-update.ts";
import rsvpCreate from "./actions/rsvp-create.ts";
import inviteList from "./actions/invite-list.ts";
import inviteCreate from "./actions/invite-create.ts";
import tagList from "./actions/tag-list.ts";
import memberTagAdd from "./actions/member-tag-add.ts";
import memberTagRemove from "./actions/member-tag-remove.ts";
import planList from "./actions/plan-list.ts";
import courseworkList from "./actions/coursework-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meGet,
    memberList,
    memberGet,
    memberFindByEmail,
    memberCreate,
    memberUpdate,
    spaceList,
    spaceGet,
    spaceCreate,
    spaceMemberList,
    spaceMemberAdd,
    spaceMemberRemove,
    postList,
    postGet,
    postCreate,
    postUpdate,
    postDelete,
    commentList,
    commentCreate,
    eventList,
    eventGet,
    eventCreate,
    eventUpdate,
    rsvpCreate,
    inviteList,
    inviteCreate,
    tagList,
    memberTagAdd,
    memberTagRemove,
    planList,
    courseworkList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
