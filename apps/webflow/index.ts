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
import anyEvent from "./triggers/any-event.ts";
import collectionItemDeleted from "./triggers/collection-item-deleted.ts";
import collectionItemPublished from "./triggers/collection-item-published.ts";
import collectionItemUnpublished from "./triggers/collection-item-unpublished.ts";
import commentCreated from "./triggers/comment-created.ts";
import inventoryChanged from "./triggers/inventory-changed.ts";
import newCollection from "./triggers/new-collection.ts";
import newProduct from "./triggers/new-product.ts";
import newSite from "./triggers/new-site.ts";
import orderChanged from "./triggers/order-changed.ts";
import pageCreated from "./triggers/page-created.ts";
import pageDeleted from "./triggers/page-deleted.ts";
import pageMetadataUpdated from "./triggers/page-metadata-updated.ts";
import sitePublish from "./triggers/site-publish.ts";
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
  triggers: [
    formSubmission,
    collectionItemCreated,
    collectionItemChanged,
    newOrder,
    collectionItemDeleted,
    collectionItemPublished,
    collectionItemUnpublished,
    orderChanged,
    inventoryChanged,
    sitePublish,
    pageCreated,
    pageMetadataUpdated,
    pageDeleted,
    commentCreated,
    anyEvent,
    newCollection,
    newSite,
    newProduct,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
