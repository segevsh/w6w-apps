import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

// Account and sites
import meGet from "./actions/me-get.ts";
import siteList from "./actions/site-list.ts";
import siteGet from "./actions/site-get.ts";

// Contacts
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

// Contact tags
import contactTagList from "./actions/contact-tag-list.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";
import contactTagReplace from "./actions/contact-tag-replace.ts";

// Contact offers - access granting
import contactOfferList from "./actions/contact-offer-list.ts";
import contactOfferGrant from "./actions/contact-offer-grant.ts";
import contactOfferRevoke from "./actions/contact-offer-revoke.ts";

// Contact notes
import contactNoteList from "./actions/contact-note-list.ts";
import contactNoteGet from "./actions/contact-note-get.ts";
import contactNoteCreate from "./actions/contact-note-create.ts";
import contactNoteUpdate from "./actions/contact-note-update.ts";
import contactNoteDelete from "./actions/contact-note-delete.ts";

// Tags and custom fields
import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import customFieldList from "./actions/custom-field-list.ts";

// Customers
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";

// Offers and products
import offerList from "./actions/offer-list.ts";
import offerGet from "./actions/offer-get.ts";
import offerProductList from "./actions/offer-product-list.ts";
import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";

// Courses
import courseList from "./actions/course-list.ts";
import courseGet from "./actions/course-get.ts";

// Orders
import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderItemList from "./actions/order-item-list.ts";

// Purchases and subscriptions
import purchaseList from "./actions/purchase-list.ts";
import purchaseGet from "./actions/purchase-get.ts";
import purchaseReactivate from "./actions/purchase-reactivate.ts";
import purchaseDeactivate from "./actions/purchase-deactivate.ts";
import purchaseCancelSubscription from "./actions/purchase-cancel-subscription.ts";

// Money
import transactionList from "./actions/transaction-list.ts";
import transactionGet from "./actions/transaction-get.ts";
import payoutList from "./actions/payout-list.ts";
import payoutGet from "./actions/payout-get.ts";

// Forms
import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formSubmit from "./actions/form-submit.ts";
import formSubmissionList from "./actions/form-submission-list.ts";
import formSubmissionGet from "./actions/form-submission-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newContact from "./triggers/new-contact.ts";
import newCustomer from "./triggers/new-customer.ts";
import newOrder from "./triggers/new-order.ts";
import newOrderItem from "./triggers/new-order-item.ts";
import newPurchase from "./triggers/new-purchase.ts";
import newOrUpdatedPurchase from "./triggers/new-or-updated-purchase.ts";
import newFormSubmission from "./triggers/new-form-submission.ts";
import newContactNote from "./triggers/new-contact-note.ts";
import newOrUpdatedContactNote from "./triggers/new-or-updated-contact-note.ts";
import newOffer from "./triggers/new-offer.ts";
import newProduct from "./triggers/new-product.ts";
import newCourse from "./triggers/new-course.ts";
import newForm from "./triggers/new-form.ts";
import newContactTag from "./triggers/new-contact-tag.ts";
import newContactOffer from "./triggers/new-contact-offer.ts";
import newOfferProduct from "./triggers/new-offer-product.ts";
import newTransaction from "./triggers/new-transaction.ts";

/**
 * Kajabi — creator commerce: courses, memberships and digital products.
 *
 * Built against the Kajabi Public API v1 (`https://api.kajabi.com/v1`), a
 * JSON:API surface described by a vendor-generated OpenAPI document. See
 * `lib/client.ts` for the wire-level contract, `auth/client-credentials.ts` for
 * the OAuth2 grant, and `README.md` for what is deliberately not covered.
 */

export default {
  actions: [
    // Account and sites
    meGet,
    siteList,
    siteGet,
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // Contact tags
    contactTagList,
    contactTagAdd,
    contactTagRemove,
    contactTagReplace,
    // Contact offers - access granting
    contactOfferList,
    contactOfferGrant,
    contactOfferRevoke,
    // Contact notes
    contactNoteList,
    contactNoteGet,
    contactNoteCreate,
    contactNoteUpdate,
    contactNoteDelete,
    // Tags and custom fields
    tagList,
    tagGet,
    customFieldList,
    // Customers
    customerList,
    customerGet,
    // Offers and products
    offerList,
    offerGet,
    offerProductList,
    productList,
    productGet,
    // Courses
    courseList,
    courseGet,
    // Orders
    orderList,
    orderGet,
    orderItemList,
    // Purchases and subscriptions
    purchaseList,
    purchaseGet,
    purchaseReactivate,
    purchaseDeactivate,
    purchaseCancelSubscription,
    // Money
    transactionList,
    transactionGet,
    payoutList,
    payoutGet,
    // Forms
    formList,
    formGet,
    formSubmit,
    formSubmissionList,
    formSubmissionGet,
  ],
  auth: [clientCredentials],
  triggers: [
    newContact,
    newCustomer,
    newOrder,
    newOrderItem,
    newPurchase,
    newOrUpdatedPurchase,
    newFormSubmission,
    newContactNote,
    newOrUpdatedContactNote,
    newOffer,
    newProduct,
    newCourse,
    newForm,
    newContactTag,
    newContactOffer,
    newOfferProduct,
    newTransaction,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
