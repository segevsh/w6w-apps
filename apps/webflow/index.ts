import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";
import listSites from "./actions/list-sites.ts";
import getSite from "./actions/get-site.ts";
import listCollections from "./actions/list-collections.ts";
import getCollection from "./actions/get-collection.ts";
import createItem from "./actions/create-item.ts";
import getItem from "./actions/get-item.ts";
import listItems from "./actions/list-items.ts";
import updateItem from "./actions/update-item.ts";
import deleteItem from "./actions/delete-item.ts";
import publishItems from "./actions/publish-items.ts";
import listProducts from "./actions/list-products.ts";
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import updateOrder from "./actions/update-order.ts";
import formSubmission from "./triggers/form-submission.ts";
import collectionItemCreated from "./triggers/collection-item-created.ts";
import collectionItemChanged from "./triggers/collection-item-changed.ts";
import newOrder from "./triggers/new-order.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listSites,
    getSite,
    listCollections,
    getCollection,
    createItem,
    getItem,
    listItems,
    updateItem,
    deleteItem,
    publishItems,
    listProducts,
    listOrders,
    getOrder,
    updateOrder,
  ],
  auth: [apiToken, oauth2],
  triggers: [formSubmission, collectionItemCreated, collectionItemChanged, newOrder],
  healthChecks: [service, quota],
} satisfies AppDefinition;
