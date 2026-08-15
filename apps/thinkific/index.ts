/**
 * Thinkific — the online course and membership platform: manage Courses,
 * Users, Enrollments, Orders, Products and Bundles over the Admin API v1
 * (`api.thinkific.com/api/public/v1`).
 *
 * Every path, verb, query parameter, body field and error shape in this app
 * was verified on 2026-08-15 against Thinkific's own OpenAPI 3.0.1 document
 * (`developers.thinkific.com/openapi/thinkific-admin-api-v1.yaml`, 164,389
 * bytes) plus its "REST API Response Format", "REST API Rate Limits",
 * "Authorization using API Key" and "REST Permissions and Scopes" support
 * articles, plus live probes against `api.thinkific.com` and
 * `status.thinkific.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The Site subdomain is a header value, not a hostname**
 *     (`auth/api-key.ts`, `lib/client.ts`). Unlike most "subdomain" SaaS APIs
 *     in this pack, the API host never changes — the vendor's own connection
 *     test sends `X-Auth-Subdomain` as a header alongside the fixed
 *     `api.thinkific.com` host.
 *  2. **Three different `errors` body shapes on a 422**, and the vendor's own
 *     docs disagree on which — an object keyed by field name (the "Response
 *     Format" article), a bare array of strings (the OpenAPI document's own
 *     `POST /enrollments` example), and an array of `{field_name}` objects
 *     (the `UnprocessableEntityError` schema). `lib/client.ts` handles all
 *     three rather than assuming one.
 *  3. **`/bundles` has no list endpoint** (`actions/bundles-get.ts`). A
 *     Bundle is only reachable by id, discovered indirectly through
 *     `products-list` (`productable_type == "Bundle"`).
 *  4. **A 401 does not always mean a bad credential.** The "Authorization
 *     using API Key" article states the identical `{"error":"Authentication
 *     Error"}` body also appears when the Site's Thinkific plan does not
 *     include API access at all — `auth/api-key.ts#test` says so rather than
 *     always blaming the key.
 *  5. **No rate-limit-remaining header exists anywhere** — only a 429 carries
 *     `RateLimit-Reset`, after the limit is already hit — so
 *     `health/quota.ts` declares the dimension unavailable rather than
 *     guessing at a number.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import coursesList from "./actions/courses-list.ts";
import coursesGet from "./actions/courses-get.ts";

import usersList from "./actions/users-list.ts";
import usersGet from "./actions/users-get.ts";
import usersCreate from "./actions/users-create.ts";
import usersUpdate from "./actions/users-update.ts";
import usersDelete from "./actions/users-delete.ts";

import enrollmentsList from "./actions/enrollments-list.ts";
import enrollmentsGet from "./actions/enrollments-get.ts";
import enrollmentsCreate from "./actions/enrollments-create.ts";
import enrollmentsUpdate from "./actions/enrollments-update.ts";

import ordersList from "./actions/orders-list.ts";
import ordersGet from "./actions/orders-get.ts";

import productsList from "./actions/products-list.ts";
import productsGet from "./actions/products-get.ts";

import bundlesGet from "./actions/bundles-get.ts";
import bundlesCoursesList from "./actions/bundles-courses-list.ts";
import bundlesEnrollmentsList from "./actions/bundles-enrollments-list.ts";
import bundlesEnrollmentCreate from "./actions/bundles-enrollment-create.ts";
import bundlesEnrollmentUpdate from "./actions/bundles-enrollment-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Courses (read-only — see courses-list.ts)
    coursesList,
    coursesGet,
    // Users
    usersList,
    usersGet,
    usersCreate,
    usersUpdate,
    usersDelete,
    // Enrollments
    enrollmentsList,
    enrollmentsGet,
    enrollmentsCreate,
    enrollmentsUpdate,
    // Orders (read-only)
    ordersList,
    ordersGet,
    // Products (read-only)
    productsList,
    productsGet,
    // Bundles
    bundlesGet,
    bundlesCoursesList,
    bundlesEnrollmentsList,
    bundlesEnrollmentCreate,
    bundlesEnrollmentUpdate,
  ],
  // API Key only. Thinkific also supports OAuth for multi-Site apps, but the
  // API key needs no Partner Portal app registration and is what a single-Site
  // integration is meant to use. See auth/api-key.ts.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
