import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// CMS — Wix Data collections and items
import listCollections from "./actions/list-collections.ts";
import getCollection from "./actions/get-collection.ts";
import queryDataItems from "./actions/query-data-items.ts";
import getDataItem from "./actions/get-data-item.ts";
import insertDataItem from "./actions/insert-data-item.ts";
import updateDataItem from "./actions/update-data-item.ts";
import removeDataItem from "./actions/remove-data-item.ts";
import countDataItems from "./actions/count-data-items.ts";
import bulkInsertDataItems from "./actions/bulk-insert-data-items.ts";

// CRM — contacts and labels
import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import queryContacts from "./actions/query-contacts.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import labelContact from "./actions/label-contact.ts";
import unlabelContact from "./actions/unlabel-contact.ts";
import listLabels from "./actions/list-labels.ts";

// Commerce — Stores catalog and eCommerce orders
import queryProducts from "./actions/query-products.ts";
import getProduct from "./actions/get-product.ts";
import searchOrders from "./actions/search-orders.ts";
import getOrder from "./actions/get-order.ts";

// Site and account
import getSiteProperties from "./actions/get-site-properties.ts";
import querySites from "./actions/query-sites.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newContact from "./triggers/new-contact.ts";
import newProduct from "./triggers/new-product.ts";
import newOrUpdatedProduct from "./triggers/new-or-updated-product.ts";
import newOrder from "./triggers/new-order.ts";
import newOrUpdatedOrder from "./triggers/new-or-updated-order.ts";
import newSite from "./triggers/new-site.ts";
import newOrUpdatedSite from "./triggers/new-or-updated-site.ts";
import newDataItem from "./triggers/new-data-item.ts";
import newOrUpdatedDataItem from "./triggers/new-or-updated-data-item.ts";
import newCollection from "./triggers/new-collection.ts";

export default {
  actions: [
    // CMS
    listCollections,
    getCollection,
    queryDataItems,
    getDataItem,
    insertDataItem,
    updateDataItem,
    removeDataItem,
    countDataItems,
    bulkInsertDataItems,
    // CRM
    listContacts,
    getContact,
    queryContacts,
    createContact,
    updateContact,
    deleteContact,
    labelContact,
    unlabelContact,
    listLabels,
    // Commerce
    queryProducts,
    getProduct,
    searchOrders,
    getOrder,
    // Site and account
    getSiteProperties,
    querySites,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
  triggers: [
    newContact,
    newProduct,
    newOrUpdatedProduct,
    newOrder,
    newOrUpdatedOrder,
    newSite,
    newOrUpdatedSite,
    newDataItem,
    newOrUpdatedDataItem,
    newCollection,
  ],
} satisfies AppDefinition;
