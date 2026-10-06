import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import accessGrantList from "./actions/access-grant-list.ts";
import automationGet from "./actions/automation-get.ts";
import automationList from "./actions/automation-list.ts";
import broadcastGet from "./actions/broadcast-get.ts";
import broadcastList from "./actions/broadcast-list.ts";
import contactAutomationStart from "./actions/contact-automation-start.ts";
import contactAutomationStop from "./actions/contact-automation-stop.ts";
import contactCourseGrant from "./actions/contact-course-grant.ts";
import contactCourseRevoke from "./actions/contact-course-revoke.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactListSubscribe from "./actions/contact-list-subscribe.ts";
import contactListUnsubscribe from "./actions/contact-list-unsubscribe.ts";
import contactList from "./actions/contact-list.ts";
import contactProductCancel from "./actions/contact-product-cancel.ts";
import contactProductPurchase from "./actions/contact-product-purchase.ts";
import contactSiteGrant from "./actions/contact-site-grant.ts";
import contactSiteRevoke from "./actions/contact-site-revoke.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";
import contactUpdate from "./actions/contact-update.ts";
import courseGet from "./actions/course-get.ts";
import courseList from "./actions/course-list.ts";
import listGet from "./actions/list-get.ts";
import listList from "./actions/list-list.ts";
import productGet from "./actions/product-get.ts";
import productList from "./actions/product-list.ts";
import purchaseGet from "./actions/purchase-get.ts";
import purchaseList from "./actions/purchase-list.ts";
import siteGet from "./actions/site-get.ts";
import siteList from "./actions/site-list.ts";
import subscriptionList from "./actions/subscription-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagGet from "./actions/tag-get.ts";
import tagList from "./actions/tag-list.ts";

/**
 * Simplero API v2 (`https://simplero.com/api/v2`), scoped to the contact and commerce core. See
 * README.md for the endpoints deliberately left out. API-key auth only — Simplero's spec
 * declares one security scheme, `X-API-Key`.
 */
export default {
  actions: [
    contactAutomationStart,
    contactAutomationStop,
    contactCourseGrant,
    contactCourseRevoke,
    contactCreate,
    contactGet,
    contactListSubscribe,
    contactListUnsubscribe,
    contactList,
    contactProductCancel,
    contactProductPurchase,
    contactSiteGrant,
    contactSiteRevoke,
    contactTagAdd,
    contactTagRemove,
    contactUpdate,
    listGet,
    listList,
    tagCreate,
    tagGet,
    tagList,
    productGet,
    productList,
    purchaseGet,
    purchaseList,
    subscriptionList,
    courseGet,
    courseList,
    accessGrantList,
    siteGet,
    siteList,
    broadcastGet,
    broadcastList,
    automationGet,
    automationList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
