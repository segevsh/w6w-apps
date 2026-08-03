import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import topicCreate from "./actions/topic-create.ts";
import topicGet from "./actions/topic-get.ts";
import topicUpdate from "./actions/topic-update.ts";
import topicDelete from "./actions/topic-delete.ts";
import topicListLatest from "./actions/topic-list-latest.ts";
import topicSetStatus from "./actions/topic-set-status.ts";

import postCreate from "./actions/post-create.ts";
import postGet from "./actions/post-get.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import postLike from "./actions/post-like.ts";

import categoryList from "./actions/category-list.ts";
import categoryCreate from "./actions/category-create.ts";
import categoryTopicList from "./actions/category-topic-list.ts";

import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userList from "./actions/user-list.ts";
import userSuspend from "./actions/user-suspend.ts";

import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupAddMembers from "./actions/group-add-members.ts";
import groupRemoveMembers from "./actions/group-remove-members.ts";

import search from "./actions/search.ts";
import messageCreate from "./actions/message-create.ts";
import siteInfoGet from "./actions/site-info-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    topicCreate,
    topicGet,
    topicUpdate,
    topicDelete,
    topicListLatest,
    topicSetStatus,
    postCreate,
    postGet,
    postUpdate,
    postDelete,
    postLike,
    categoryList,
    categoryCreate,
    categoryTopicList,
    userGet,
    userCreate,
    userUpdate,
    userList,
    userSuspend,
    groupList,
    groupGet,
    groupAddMembers,
    groupRemoveMembers,
    search,
    messageCreate,
    siteInfoGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;
