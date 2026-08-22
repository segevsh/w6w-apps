/**
 * Storyblok — read published and draft content, and create, update, publish
 * and organise stories.
 *
 * The shape of this app follows from Storyblok having **two APIs that share
 * nothing**: a cached, read-only Content Delivery API whose token goes in the
 * query string, and a read-write Management API whose personal access token
 * goes in a header with no scheme. Different hosts, different credentials,
 * different rate limits by two orders of magnitude. So there are two auth
 * methods, and every action refuses early when the connection holds the wrong
 * one — because Storyblok's own answer to all of it is a bare
 * `{"error":"Unauthorized"}`.
 *
 * The other thing worth knowing before reading further: on the delivery API a
 * **bigger page is slower**. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import deliveryToken from "./auth/delivery-token.ts";
import managementToken from "./auth/management-token.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

import storyGet from "./actions/story-get.ts";
import storyList from "./actions/story-list.ts";
import linkList from "./actions/link-list.ts";
import datasourceEntryList from "./actions/datasource-entry-list.ts";
import spaceGet from "./actions/space-get.ts";
import storySearch from "./actions/story-search.ts";
import storyCreate from "./actions/story-create.ts";
import storyUpdate from "./actions/story-update.ts";
import storyPublish from "./actions/story-publish.ts";
import storyMove from "./actions/story-move.ts";
import storyDelete from "./actions/story-delete.ts";
import componentList from "./actions/component-list.ts";
import assetList from "./actions/asset-list.ts";
import spaceList from "./actions/space-list.ts";

const app: AppDefinition = {
  actions: [
    storyGet,
    storyList,
    linkList,
    datasourceEntryList,
    spaceGet,
    storySearch,
    storyCreate,
    storyUpdate,
    storyPublish,
    storyMove,
    storyDelete,
    componentList,
    assetList,
    spaceList,
  ],
  auth: [deliveryToken, managementToken],
  healthChecks: [service, api],
};

export default app;
