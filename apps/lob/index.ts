/**
 * Lob — print and mail, and address verification, over the Lob API (`api.lob.com/v1`).
 *
 * Every path, verb, body field, enum and header in this app was verified on 2026-10-06 against
 * Lob's own OpenAPI 3.0.3 document (`lob/lob-openapi`, `dist/lob-api-bundled.yml`, `info.version`
 * 1.22.0) plus live probes of `api.lob.com` (missing key, wrong key, unknown route) and
 * `status.lob.com`. Nothing came from a third-party integration directory.
 *
 * Findings that shaped the design (each documented where it matters):
 *
 *  1. **Test and live keys share one host** — the key prefix (`test_…` / `live_…`) decides
 *     whether a postcard is really printed and billed (`auth/api-key.ts`, README).
 *  2. **A missing key and a wrong key are both HTTP 401** and differ only by the body's
 *     `error.code` (`unauthorized` vs `invalid_api_key`), so credential validity is read from
 *     the code, never the status (`auth/api-key.ts`).
 *  3. **A read of a bank account returns the full account number** — Lob's schema requires
 *     `account_number` in every response — so it is stripped before any action returns
 *     (`lib/client.ts`).
 *  4. **Mail creates are the one place a retry costs a physical letter**, so they send an
 *     `Idempotency-Key` (the caller's, else the run's invocation id) (`lib/mail.ts`).
 *  5. **`use_type` is required** on every mailpiece create, and `status.lob.com` redirects to
 *     `lob.statuspage.io`, which is the host the health check must name (`health/service.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import addressList from "./actions/address-list.ts";
import addressGet from "./actions/address-get.ts";
import addressDelete from "./actions/address-delete.ts";
import addressCreate from "./actions/address-create.ts";
import usVerify from "./actions/us-verify.ts";
import intlVerify from "./actions/intl-verify.ts";
import usAutocomplete from "./actions/us-autocomplete.ts";
import usZipLookup from "./actions/us-zip-lookup.ts";
import postcardCreate from "./actions/postcard-create.ts";
import postcardList from "./actions/postcard-list.ts";
import postcardGet from "./actions/postcard-get.ts";
import postcardCancel from "./actions/postcard-cancel.ts";
import letterCreate from "./actions/letter-create.ts";
import letterList from "./actions/letter-list.ts";
import letterGet from "./actions/letter-get.ts";
import letterCancel from "./actions/letter-cancel.ts";
import selfMailerCreate from "./actions/self-mailer-create.ts";
import selfMailerList from "./actions/self-mailer-list.ts";
import selfMailerGet from "./actions/self-mailer-get.ts";
import selfMailerDelete from "./actions/self-mailer-delete.ts";
import checkCreate from "./actions/check-create.ts";
import checkList from "./actions/check-list.ts";
import checkGet from "./actions/check-get.ts";
import checkCancel from "./actions/check-cancel.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateDelete from "./actions/template-delete.ts";
import templateCreate from "./actions/template-create.ts";
import templateUpdate from "./actions/template-update.ts";
import templateVersionCreate from "./actions/template-version-create.ts";
import templateVersionList from "./actions/template-version-list.ts";
import bankAccountList from "./actions/bank-account-list.ts";
import bankAccountGet from "./actions/bank-account-get.ts";
import bankAccountDelete from "./actions/bank-account-delete.ts";
import bankAccountCreate from "./actions/bank-account-create.ts";
import bankAccountVerify from "./actions/bank-account-verify.ts";
import creditsBalanceGet from "./actions/credits-balance-get.ts";
import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    // address
    addressList,
    addressGet,
    addressDelete,
    addressCreate,
    // verification
    usVerify,
    intlVerify,
    usAutocomplete,
    usZipLookup,
    // postcard
    postcardCreate,
    postcardList,
    postcardGet,
    postcardCancel,
    // letter
    letterCreate,
    letterList,
    letterGet,
    letterCancel,
    // self-mailer
    selfMailerCreate,
    selfMailerList,
    selfMailerGet,
    selfMailerDelete,
    // check
    checkCreate,
    checkList,
    checkGet,
    checkCancel,
    // template
    templateList,
    templateGet,
    templateDelete,
    templateCreate,
    templateUpdate,
    templateVersionCreate,
    templateVersionList,
    // bank-account
    bankAccountList,
    bankAccountGet,
    bankAccountDelete,
    bankAccountCreate,
    bankAccountVerify,
    // account
    creditsBalanceGet,
  ],
  // API key only. Lob publishes no OAuth surface; the key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
