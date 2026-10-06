/**
 * TalentLMS — cloud learning management system.
 *
 * Built against TalentLMS's own API reference (the 67-page PDF at
 * <https://market.talentlms.com/pages/docs/TalentLMS-API-Documentation.pdf>, v1), not
 * from memory. The decisions that shape this app:
 *
 *   - **Per-account host.** Every domain is `<name>.talentlms.com`, so
 *     `w6w.network.allow` declares `*.talentlms.com` and the subdomain is an Auth field recorded
 *     on the Connection (`afterConnect`), exactly like the sibling Freshservice app.
 *   - **Basic auth, key as username.** The API key is the Basic username and the password is
 *     empty. Credentials live only in `sign`.
 *   - **Two request shapes.** The reference lists each endpoint's URL pattern. Lookups and the
 *     one-line mutations carry their arguments in the path as `/v1/<endpoint>/<key>:<value>,...`
 *     (a GET); create/edit/delete endpoints list a bare `/v1/<endpoint>` and take their fields in
 *     the request body. The PDF documents the calls through its PHP library and never states the
 *     body encoding, so bodies are sent as a form (`application/x-www-form-urlencoded`), which is
 *     what that library does.
 *   - **Everything is a string.** Ids, counts and flags come back as JSON strings, and dates are
 *     `DD/MM/YYYY, HH:MM:SS` in the account's own format — the app passes them through untouched.
 *
 * Deliberately absent, and why:
 *
 *   - **User login / logout, forgot username / password.** They take a learner's password or send
 *     email on the learner's behalf — end-user flows, not account administration.
 *   - **The optional redirect arguments of "Get Course Login URL".** The reference says they must
 *     be base64-encoded outside the PHP library but never says how they sit in the path.
 *   - **Branch e-commerce fields** (processor, subscription, credits, PayPal): listed for branch
 *     creation without value formats.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";
import userGetMany from "./actions/user-get-many.ts";
import userCreate from "./actions/user-create.ts";
import userEdit from "./actions/user-edit.ts";
import userDelete from "./actions/user-delete.ts";
import userSetStatus from "./actions/user-set-status.ts";
import userIsOnline from "./actions/user-is-online.ts";
import userGetByCustomField from "./actions/user-get-by-custom-field.ts";
import userCustomFieldsGet from "./actions/user-custom-fields-get.ts";
import courseGet from "./actions/course-get.ts";
import courseGetMany from "./actions/course-get-many.ts";
import courseCreate from "./actions/course-create.ts";
import courseDelete from "./actions/course-delete.ts";
import courseEnrollUser from "./actions/course-enroll-user.ts";
import courseUnenrollUser from "./actions/course-unenroll-user.ts";
import courseGoto from "./actions/course-goto.ts";
import courseCustomFieldsGet from "./actions/course-custom-fields-get.ts";
import courseGetByCustomField from "./actions/course-get-by-custom-field.ts";
import courseGetUserStatus from "./actions/course-get-user-status.ts";
import courseResetUserProgress from "./actions/course-reset-user-progress.ts";
import categoryGet from "./actions/category-get.ts";
import categoryGetMany from "./actions/category-get-many.ts";
import categoryGetLeafsAndCourses from "./actions/category-get-leafs-and-courses.ts";
import groupGet from "./actions/group-get.ts";
import groupGetMany from "./actions/group-get-many.ts";
import groupCreate from "./actions/group-create.ts";
import groupDelete from "./actions/group-delete.ts";
import groupAddUser from "./actions/group-add-user.ts";
import groupRemoveUser from "./actions/group-remove-user.ts";
import groupAddCourse from "./actions/group-add-course.ts";
import branchGet from "./actions/branch-get.ts";
import branchGetMany from "./actions/branch-get-many.ts";
import branchCreate from "./actions/branch-create.ts";
import branchDelete from "./actions/branch-delete.ts";
import branchAddUser from "./actions/branch-add-user.ts";
import branchRemoveUser from "./actions/branch-remove-user.ts";
import branchAddCourse from "./actions/branch-add-course.ts";
import branchSetStatus from "./actions/branch-set-status.ts";
import unitGetProgress from "./actions/unit-get-progress.ts";
import testGetAnswers from "./actions/test-get-answers.ts";
import surveyGetAnswers from "./actions/survey-get-answers.ts";
import iltGetSessions from "./actions/ilt-get-sessions.ts";
import siteInfoGet from "./actions/site-info-get.ts";
import rateLimitGet from "./actions/rate-limit-get.ts";
import timelineGet from "./actions/timeline-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGet,
    userGetMany,
    userCreate,
    userEdit,
    userDelete,
    userSetStatus,
    userIsOnline,
    userGetByCustomField,
    userCustomFieldsGet,
    courseGet,
    courseGetMany,
    courseCreate,
    courseDelete,
    courseEnrollUser,
    courseUnenrollUser,
    courseGoto,
    courseCustomFieldsGet,
    courseGetByCustomField,
    courseGetUserStatus,
    courseResetUserProgress,
    categoryGet,
    categoryGetMany,
    categoryGetLeafsAndCourses,
    groupGet,
    groupGetMany,
    groupCreate,
    groupDelete,
    groupAddUser,
    groupRemoveUser,
    groupAddCourse,
    branchGet,
    branchGetMany,
    branchCreate,
    branchDelete,
    branchAddUser,
    branchRemoveUser,
    branchAddCourse,
    branchSetStatus,
    unitGetProgress,
    testGetAnswers,
    surveyGetAnswers,
    iltGetSessions,
    siteInfoGet,
    rateLimitGet,
    timelineGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
