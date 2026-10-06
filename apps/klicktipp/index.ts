/**
 * KlickTipp — German email-marketing and marketing-automation platform.
 *
 * Every path, parameter and response shape was taken from the vendor's own
 * OpenAPI documents (https://developers.klicktipp.com/_bundle/management-api.yaml,
 * 18 paths, and `listbuilding-api.yaml`, 3 paths) and the authentication, error
 * handling and listbuilding guides, fetched 2026-10-06. All 21 documented paths
 * are covered: the 16 non-auth Management paths carry 22 actions (several paths
 * take more than one method), `/account/login` and `/account/logout` are the
 * `session` auth's exchange/revoke, and the 3 Listbuilding paths are 3 actions.
 *
 * ## Two connections, because the vendor has two credentials
 *
 * - `session` — username + password, traded at `/account/login` for a session
 *   cookie. Every Management action runs on it.
 * - `listbuilding-key` — a Listbuilding API key sent as `apikey` in the JSON
 *   body. Only the three `listbuilding-*` actions run on it.
 *
 * The runtime has no per-action auth binding, so the wrong pairing is not
 * refused up front: the vendor answers it (403 `API access denied` for a
 * Management action without a session; error 100 for a Listbuilding action
 * without the key).
 *
 * Not implemented: Developer Key + Customer Key (`X-Un` / `X-Ci`) — the guide
 * does not publish how `X-Ci` is built — and Managed OAuth, whose client
 * credentials the vendor does not issue to users.
 */
import type { AppDefinition } from "@w6w/types";
import session from "./auth/session.ts";
import listbuildingKey from "./auth/listbuilding-key.ts";
import subscriberList from "./actions/subscriber-list.ts";
import subscriberGet from "./actions/subscriber-get.ts";
import subscriberBulkGet from "./actions/subscriber-bulk-get.ts";
import subscriberChanged from "./actions/subscriber-changed.ts";
import subscriberUpsert from "./actions/subscriber-upsert.ts";
import subscriberUpdate from "./actions/subscriber-update.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberUnsubscribe from "./actions/subscriber-unsubscribe.ts";
import subscriberTag from "./actions/subscriber-tag.ts";
import subscriberUntag from "./actions/subscriber-untag.ts";
import subscriberSearch from "./actions/subscriber-search.ts";
import subscriberTagged from "./actions/subscriber-tagged.ts";
import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";
import fieldList from "./actions/field-list.ts";
import fieldGet from "./actions/field-get.ts";
import optinList from "./actions/optin-list.ts";
import optinGet from "./actions/optin-get.ts";
import optinRedirect from "./actions/optin-redirect.ts";
import listbuildingSignin from "./actions/listbuilding-signin.ts";
import listbuildingSignoff from "./actions/listbuilding-signoff.ts";
import listbuildingSignout from "./actions/listbuilding-signout.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";

export default {
  actions: [
    subscriberList,
    subscriberGet,
    subscriberBulkGet,
    subscriberChanged,
    subscriberUpsert,
    subscriberUpdate,
    subscriberDelete,
    subscriberUnsubscribe,
    subscriberTag,
    subscriberUntag,
    subscriberSearch,
    subscriberTagged,
    tagList,
    tagGet,
    tagCreate,
    tagUpdate,
    tagDelete,
    fieldList,
    fieldGet,
    optinList,
    optinGet,
    optinRedirect,
    listbuildingSignin,
    listbuildingSignoff,
    listbuildingSignout,
  ],
  auth: [session, listbuildingKey],
  healthChecks: [service, api],
} satisfies AppDefinition;
