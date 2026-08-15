/**
 * RingCentral — cloud business phone / unified communications: send SMS,
 * read the message store and call log, look up extensions and the company
 * directory, place RingOut calls and read presence — over the RingCentral
 * Platform API v1.0 (`platform.ringcentral.com/restapi/v1.0`).
 *
 * Every path, verb, query parameter, body field and permission name in this
 * app was verified on 2026-08-15 against RingCentral's own machine-readable
 * OpenAPI 3.1 document
 * (`netstorage.ringcentral.com/dpw/api-reference/specs/rc-platform.yml`,
 * 1,538,792 bytes) plus live probes against `platform.ringcentral.com` and
 * `status.ringcentral.com`. Nothing here came from a third-party integration
 * directory. See `README.md` for the full account, and for exactly what this
 * app deliberately leaves out of RingCentral's ~450-operation surface.
 *
 * The three findings that shaped the design:
 *
 *  1. **This is a two-auth-method vendor, and the choice is about WHEN the
 *     workflow runs, not preference** (`auth/oauth2.ts`, `auth/jwt-bearer.ts`).
 *     Authorization Code + PKCE needs a live browser session; a scheduled
 *     trigger firing unattended needs the JWT Bearer grant instead, which
 *     mints tokens from a long-lived credential string pasted from Developer
 *     Console — this app never signs a JWT itself, RingCentral already did
 *     that when the credential was issued.
 *  2. **The error envelope carries useful detail RingCentral's own OpenAPI
 *     schema under-documents** (`lib/client.ts`). A live probe shows both a
 *     top-level `errorCode`/`message` AND a nested `errors[]` array with
 *     per-item detail, not just the `errors[]`-only shape the
 *     `ApiErrorResponseModel` schema declares as required.
 *  3. **The vendor's own status page is real but its data feed is not
 *     documented anywhere** (`health/service.ts`). It is a client-rendered
 *     dashboard whose data host answers 404 to every guessed path — reachability
 *     of the API itself (`health/api.ts`) is the only signal this app can use
 *     safely.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import jwtBearer from "./auth/jwt-bearer.ts";

import accountGet from "./actions/account-get.ts";
import extensionList from "./actions/extension-list.ts";
import extensionGet from "./actions/extension-get.ts";
import phoneNumberList from "./actions/phone-number-list.ts";
import directoryEntriesList from "./actions/directory-entries-list.ts";
import smsSend from "./actions/sms-send.ts";
import messageStoreList from "./actions/message-store-list.ts";
import messageStoreGet from "./actions/message-store-get.ts";
import callLogList from "./actions/call-log-list.ts";
import callLogGet from "./actions/call-log-get.ts";
import presenceGet from "./actions/presence-get.ts";
import ringOutCreate from "./actions/ring-out-create.ts";
import ringOutGet from "./actions/ring-out-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    accountGet,
    // Extensions
    extensionList,
    extensionGet,
    // Phone numbers
    phoneNumberList,
    // Company directory
    directoryEntriesList,
    // SMS
    smsSend,
    // Message store
    messageStoreList,
    messageStoreGet,
    // Call log
    callLogList,
    callLogGet,
    // Presence
    presenceGet,
    // RingOut
    ringOutCreate,
    ringOutGet,
  ],
  auth: [oauth2, jwtBearer],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
