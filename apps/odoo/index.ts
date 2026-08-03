import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

// Contacts & companies — `res.partner`, the model everything else points at
import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";

// CRM pipeline — `crm.lead`
import listLeads from "./actions/list-leads.ts";
import getLead from "./actions/get-lead.ts";
import createLead from "./actions/create-lead.ts";
import updateLead from "./actions/update-lead.ts";

// Sales — `sale.order`
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import createOrder from "./actions/create-order.ts";
import confirmOrder from "./actions/confirm-order.ts";

// Catalogue — `product.product`
import listProducts from "./actions/list-products.ts";
import getProduct from "./actions/get-product.ts";

// Users — `res.users`, the ids assignment fields reference
import listUsers from "./actions/list-users.ts";

// Discovery & escape hatches — an Odoo database's surface is per-installation,
// so it has to be discoverable at runtime rather than enumerated in a manifest.
import listModels from "./actions/list-models.ts";
import describeModel from "./actions/describe-model.ts";
import searchRecords from "./actions/search-records.ts";
import countRecords from "./actions/count-records.ts";
import callMethod from "./actions/call-method.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contact
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    // Lead / opportunity
    listLeads,
    getLead,
    createLead,
    updateLead,
    // Sales order
    listOrders,
    getOrder,
    createOrder,
    confirmOrder,
    // Product
    listProducts,
    getProduct,
    // User
    listUsers,
    // Discovery and escape hatches
    listModels,
    describeModel,
    searchRecords,
    countRecords,
    callMethod,
  ],
  auth: [apiKey],
  healthChecks: [service, instance, quota],
} satisfies AppDefinition;
