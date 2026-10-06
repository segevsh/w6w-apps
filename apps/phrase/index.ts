/**
 * Phrase Strings — software localization (formerly PhraseApp): projects, locales,
 * translation keys, translations, file uploads and downloads, and jobs, over the
 * Phrase Strings API v2.
 *
 * Verified 2026-10-06 against Phrase's compiled OpenAPI document
 * (`github.com/phrase/openapi` `doc/compiled.json`, v2.0.0, 184 paths) and the developer hub
 * (`developers.phrase.com/en/api/strings`), plus live probes of both data centres and of
 * `status.phrase.com`. Phrase TMS is a different product with a different API and is not
 * covered.
 *
 * Findings that shaped the design:
 *
 *  1. **Two data centres, one credential shape** (`lib/client.ts`). EU is `api.phrase.com`,
 *     US is `api.us.app.phrase.com`; a token is only valid on the one that minted it. The
 *     region is a connection field, published to `connection.display` by `afterConnect`.
 *  2. **A bad token returns an empty body** (`auth/access-token.ts`). 401 is an empty
 *     `text/html` response on both hosts, so there is no vendor error code to classify; the
 *     liveness probe passes only on the documented `GET /v2/user` JSON shape.
 *  3. **Lists are bare arrays; position lives in headers** (`lib/client.ts`). `page` /
 *     `per_page` (max 100) go in, and `Pagination` + `Link` headers come out, so every list
 *     action here returns `{ items, page, perPage, totalCount, totalPages, nextPage }`.
 *  4. **Status is per product AND per region** (`health/service.ts`). The status page rolls up
 *     Strings, TMS, Orchestrator and more, each EU and US; only the connection's own
 *     "Phrase Strings" `API` component decides the verdict.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import userGet from "./actions/user-get.ts";
import accountList from "./actions/account-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import localeList from "./actions/locale-list.ts";
import localeGet from "./actions/locale-get.ts";
import localeCreate from "./actions/locale-create.ts";
import localeDownload from "./actions/locale-download.ts";
import keyList from "./actions/key-list.ts";
import keyGet from "./actions/key-get.ts";
import keyCreate from "./actions/key-create.ts";
import keyUpdate from "./actions/key-update.ts";
import keyDelete from "./actions/key-delete.ts";
import keySearch from "./actions/key-search.ts";
import keysTag from "./actions/keys-tag.ts";
import translationList from "./actions/translation-list.ts";
import translationGet from "./actions/translation-get.ts";
import translationCreate from "./actions/translation-create.ts";
import translationUpdate from "./actions/translation-update.ts";
import translationVerify from "./actions/translation-verify.ts";
import uploadCreate from "./actions/upload-create.ts";
import uploadList from "./actions/upload-list.ts";
import uploadGet from "./actions/upload-get.ts";
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCreate from "./actions/job-create.ts";
import jobStart from "./actions/job-start.ts";
import jobComplete from "./actions/job-complete.ts";
import tagList from "./actions/tag-list.ts";
import formatList from "./actions/format-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGet,
    accountList,
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    localeList,
    localeGet,
    localeCreate,
    localeDownload,
    keyList,
    keyGet,
    keyCreate,
    keyUpdate,
    keyDelete,
    keySearch,
    keysTag,
    translationList,
    translationGet,
    translationCreate,
    translationUpdate,
    translationVerify,
    uploadCreate,
    uploadList,
    uploadGet,
    jobList,
    jobGet,
    jobCreate,
    jobStart,
    jobComplete,
    tagList,
    formatList,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
