import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberSearch from "./actions/member-search.ts";
import memberInvite from "./actions/member-invite.ts";
import memberUpdate from "./actions/member-update.ts";
import memberDeactivate from "./actions/member-deactivate.ts";
import memberBan from "./actions/member-ban.ts";

import spaceList from "./actions/space-list.ts";
import spaceGet from "./actions/space-get.ts";
import spaceCreate from "./actions/space-create.ts";
import spaceGroupList from "./actions/space-group-list.ts";

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
import commentDelete from "./actions/comment-delete.ts";

import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventAttendeeList from "./actions/event-attendee-list.ts";
import eventAttendeeAdd from "./actions/event-attendee-add.ts";
import eventAttendeeRemove from "./actions/event-attendee-remove.ts";

import memberTagList from "./actions/member-tag-list.ts";
import taggedMemberAdd from "./actions/tagged-member-add.ts";
import taggedMemberRemove from "./actions/tagged-member-remove.ts";

import communityGet from "./actions/community-get.ts";
import messageCreate from "./actions/message-create.ts";
import search from "./actions/search.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    memberList,
    memberGet,
    memberSearch,
    memberInvite,
    memberUpdate,
    memberDeactivate,
    memberBan,
    spaceList,
    spaceGet,
    spaceCreate,
    spaceGroupList,
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
    commentDelete,
    eventList,
    eventGet,
    eventAttendeeList,
    eventAttendeeAdd,
    eventAttendeeRemove,
    memberTagList,
    taggedMemberAdd,
    taggedMemberRemove,
    communityGet,
    messageCreate,
    search,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
