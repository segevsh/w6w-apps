/**
 * EasyPost — rate a parcel across every carrier, buy the label, track it to the
 * door, verify addresses before they cost a return, and insure what matters.
 *
 * See `lib/client.ts` for the shape everything rests on: shipping is two steps,
 * and only the second one costs money.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";
import quota from "./health/quota.ts";

import shipmentCreate from "./actions/shipment-create.ts";
import shipmentBuy from "./actions/shipment-buy.ts";
import shipmentGet from "./actions/shipment-get.ts";
import shipmentList from "./actions/shipment-list.ts";
import shipmentRefund from "./actions/shipment-refund.ts";
import shipmentLabelFormat from "./actions/shipment-label-format.ts";
import addressVerify from "./actions/address-verify.ts";
import addressCreate from "./actions/address-create.ts";
import parcelCreate from "./actions/parcel-create.ts";
import trackerCreate from "./actions/tracker-create.ts";
import trackerGet from "./actions/tracker-get.ts";
import trackerList from "./actions/tracker-list.ts";
import insuranceCreate from "./actions/insurance-create.ts";
import carrierAccountList from "./actions/carrier-account-list.ts";
import scanFormCreate from "./actions/scan-form-create.ts";
import pickupCreate from "./actions/pickup-create.ts";
import pickupBuy from "./actions/pickup-buy.ts";
import pickupCancel from "./actions/pickup-cancel.ts";
import eventList from "./actions/event-list.ts";

const app: AppDefinition = {
  actions: [
    shipmentCreate,
    shipmentBuy,
    shipmentGet,
    shipmentList,
    shipmentRefund,
    shipmentLabelFormat,
    addressVerify,
    addressCreate,
    parcelCreate,
    trackerCreate,
    trackerGet,
    trackerList,
    insuranceCreate,
    carrierAccountList,
    scanFormCreate,
    pickupCreate,
    pickupBuy,
    pickupCancel,
    eventList,
  ],
  auth: [apiKey],
  healthChecks: [service, account, quota],
};

export default app;
