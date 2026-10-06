import type { AppDefinition } from "@w6w/types";
import activityCreate from "./actions/activity-create.ts";
import activityDelete from "./actions/activity-delete.ts";
import activityGet from "./actions/activity-get.ts";
import activityList from "./actions/activity-list.ts";
import activityTypeList from "./actions/activity-type-list.ts";
import activityUpdate from "./actions/activity-update.ts";
import appointmentCreate from "./actions/appointment-create.ts";
import appointmentDelete from "./actions/appointment-delete.ts";
import appointmentList from "./actions/appointment-list.ts";
import appointmentTypeList from "./actions/appointment-type-list.ts";
import appointmentUpdate from "./actions/appointment-update.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignDelete from "./actions/campaign-delete.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import commentCreate from "./actions/comment-create.ts";
import commentDelete from "./actions/comment-delete.ts";
import commentGet from "./actions/comment-get.ts";
import commentList from "./actions/comment-list.ts";
import commentUpdate from "./actions/comment-update.ts";
import companyCreate from "./actions/company-create.ts";
import companyDelete from "./actions/company-delete.ts";
import companyGet from "./actions/company-get.ts";
import companyList from "./actions/company-list.ts";
import companyUpdate from "./actions/company-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import currencyList from "./actions/currency-list.ts";
import customFieldList from "./actions/custom-field-list.ts";
import orderCreate from "./actions/order-create.ts";
import orderDelete from "./actions/order-delete.ts";
import orderGet from "./actions/order-get.ts";
import orderList from "./actions/order-list.ts";
import orderStageCreate from "./actions/order-stage-create.ts";
import orderStageDelete from "./actions/order-stage-delete.ts";
import orderStageGet from "./actions/order-stage-get.ts";
import orderStageList from "./actions/order-stage-list.ts";
import orderStageUpdate from "./actions/order-stage-update.ts";
import orderUpdate from "./actions/order-update.ts";
import priceListCreate from "./actions/price-list-create.ts";
import priceListGet from "./actions/price-list-get.ts";
import priceListList from "./actions/price-list-list.ts";
import priceListUpdate from "./actions/price-list-update.ts";
import productCategoryCreate from "./actions/product-category-create.ts";
import productCategoryDelete from "./actions/product-category-delete.ts";
import productCategoryGet from "./actions/product-category-get.ts";
import productCategoryList from "./actions/product-category-list.ts";
import productCategoryUpdate from "./actions/product-category-update.ts";
import productCreate from "./actions/product-create.ts";
import productGet from "./actions/product-get.ts";
import productList from "./actions/product-list.ts";
import productUpdate from "./actions/product-update.ts";
import selfGet from "./actions/self-get.ts";
import subscriptionDelete from "./actions/subscription-delete.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionList from "./actions/subscription-list.ts";
import ticketCommentAdd from "./actions/ticket-comment-add.ts";
import ticketCreate from "./actions/ticket-create.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketList from "./actions/ticket-list.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    activityCreate,
    activityDelete,
    activityGet,
    activityList,
    activityTypeList,
    activityUpdate,
    appointmentCreate,
    appointmentDelete,
    appointmentList,
    appointmentTypeList,
    appointmentUpdate,
    campaignCreate,
    campaignDelete,
    campaignGet,
    campaignList,
    campaignUpdate,
    commentCreate,
    commentDelete,
    commentGet,
    commentList,
    commentUpdate,
    companyCreate,
    companyDelete,
    companyGet,
    companyList,
    companyUpdate,
    contactCreate,
    contactDelete,
    contactGet,
    contactList,
    contactUpdate,
    currencyList,
    customFieldList,
    orderCreate,
    orderDelete,
    orderGet,
    orderList,
    orderStageCreate,
    orderStageDelete,
    orderStageGet,
    orderStageList,
    orderStageUpdate,
    orderUpdate,
    priceListCreate,
    priceListGet,
    priceListList,
    priceListUpdate,
    productCategoryCreate,
    productCategoryDelete,
    productCategoryGet,
    productCategoryList,
    productCategoryUpdate,
    productCreate,
    productGet,
    productList,
    productUpdate,
    selfGet,
    subscriptionDelete,
    subscriptionGet,
    subscriptionList,
    ticketCommentAdd,
    ticketCreate,
    ticketDelete,
    ticketGet,
    ticketList,
    ticketUpdate,
    userGet,
    userList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
