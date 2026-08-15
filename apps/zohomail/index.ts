/**
 * Zoho Mail — send, search and manage email over the Zoho Mail REST API
 * (`https://mail.zoho.com/api/...`, and its seven regional siblings).
 *
 * Every path, verb, query parameter, body field and error shape in this app
 * was verified on 2026-08-15 against Zoho's own documentation
 * (`https://www.zoho.com/mail/help/api/`, 95,001 bytes — the index — plus
 * every per-endpoint page it links to) and live probes against
 * `mail.zoho.com`, its seven regional siblings, and `accounts.zoho.com` (and
 * siblings). Nothing here came from a third-party integration directory.
 *
 * Scoped to **Zoho Mail specifically** — this pack already ships `zoho`
 * (Zoho CRM), a separate product with a separate API surface; do not confuse
 * the two.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Multi-data-centre is the whole game** (`lib/regions.ts`,
 *     `auth/oauth2.ts`). Zoho hosts every account in one of eight regional
 *     data centres, each with its own OAuth host (`accounts.zoho.<tld>`) and
 *     its own API host (`mail.zoho.<tld>`) — and the OAuth host is baked
 *     into the authorization flow itself, so a single `oauth2` method with a
 *     "data centre" field cannot express it (the browser is already
 *     redirected to a fixed host by the time such a field would be read).
 *     This app declares one `AuthDefinition` per data centre instead, all
 *     eight verified live on 2026-08-15.
 *  2. **The error envelope is not Zoho CRM's** (`lib/client.ts`). Zoho CRM's
 *     error body is flat (`{code, message, status}`); Zoho Mail's is nested
 *     under `data` (`{"data":{"errorCode","moreInfo"?},"status":{"code",
 *     "description"}}`) — confirmed live. Two Zoho products under the same
 *     `Zoho-oauthtoken` scheme, two different error shapes.
 *  3. **Half the `updatemessage` responses carry no `data` at all**
 *     (`lib/client.ts`). Mark-read, move, and apply-label all answer
 *     `{"status":{"code":200,"description":"success"}}` with no `data` key —
 *     treating that as a parse failure would break every one of them.
 *  4. **No quota surface exists** (`health/quota.ts`). Unlike Zoho CRM's
 *     `X-API-CREDITS-REMAINING`, Zoho Mail's REST API documents no
 *     rate-limit or credit endpoint, and a live probe carries no
 *     `X-RateLimit-*` header at all — declared absent rather than guessed.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";

import folderList from "./actions/folder-list.ts";
import folderCreate from "./actions/folder-create.ts";

import labelList from "./actions/label-list.ts";
import labelCreate from "./actions/label-create.ts";

import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageSearch from "./actions/message-search.ts";
import messageGet from "./actions/message-get.ts";
import messageContentGet from "./actions/message-content-get.ts";
import messageHeaderGet from "./actions/message-header-get.ts";
import messageMarkRead from "./actions/message-mark-read.ts";
import messageMove from "./actions/message-move.ts";
import messageLabelApply from "./actions/message-label-apply.ts";
import messageDelete from "./actions/message-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Accounts
    accountList,
    accountGet,
    // Folders
    folderList,
    folderCreate,
    // Labels
    labelList,
    labelCreate,
    // Messages
    messageSend,
    messageList,
    messageSearch,
    messageGet,
    messageContentGet,
    messageHeaderGet,
    messageMarkRead,
    messageMove,
    messageLabelApply,
    messageDelete,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
