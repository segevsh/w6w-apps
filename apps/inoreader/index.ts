/**
 * Inoreader — RSS/news reader, via its developer API (`www.inoreader.com/reader/api/0`).
 * See `README.md` for the plan requirement, quota zones and what is deliberately left out.
 */
import type { AppDefinition } from "@w6w/types";

import userInfo from "./actions/user-info.ts";
import subscriptionsList from "./actions/subscriptions-list.ts";
import subscriptionAdd from "./actions/subscription-add.ts";
import subscriptionEdit from "./actions/subscription-edit.ts";
import tagsList from "./actions/tags-list.ts";
import unreadCounts from "./actions/unread-counts.ts";
import streamContents from "./actions/stream-contents.ts";
import itemIds from "./actions/item-ids.ts";
import streamPreferencesList from "./actions/stream-preferences-list.ts";
import streamPreferencesSet from "./actions/stream-preferences-set.ts";
import tagRename from "./actions/tag-rename.ts";
import tagDelete from "./actions/tag-delete.ts";
import itemTagsEdit from "./actions/item-tags-edit.ts";
import itemsMarkRead from "./actions/items-mark-read.ts";
import markAllAsRead from "./actions/mark-all-as-read.ts";

import oauth2 from "./auth/oauth2.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userInfo,
    subscriptionsList,
    subscriptionAdd,
    subscriptionEdit,
    tagsList,
    unreadCounts,
    streamContents,
    itemIds,
    streamPreferencesList,
    streamPreferencesSet,
    tagRename,
    tagDelete,
    itemTagsEdit,
    itemsMarkRead,
    markAllAsRead,
  ],
  auth: [oauth2],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
