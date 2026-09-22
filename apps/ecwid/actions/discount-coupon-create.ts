import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody } from "../lib/client.ts";
import {
  couponApplicationLimitOptions,
  couponDiscountTypeOptions,
  couponStatusOptions,
  couponUsesLimitOptions,
  extraFieldsParam,
} from "../lib/params.ts";

/**
 * `POST /discount_coupons` — create a discount coupon.
 *
 * The vendor marks **no** field Required on this page, but its own example sends
 * the five that make a coupon usable: `name`, `code`, `discountType`, `status`
 * and `discount`. They are typed here (and the first three are the ones a
 * workflow gets wrong — a coupon without a discount type or a code is not one a
 * customer can use), while everything else stays optional so a caller can build
 * a minimal coupon.
 *
 * `discount` is only meaningful for the absolute and percentage types; a
 * `SHIPPING` coupon's value is not a money amount, so leaving it at 0 there is
 * correct rather than an oversight.
 *
 * `launchDate` and `expirationDate` take `2014-06-06 08:00:00 +0400` — the docs
 * note any offset given is corrected to UTC+0.
 *
 * Answers `{"id": <coupon id>, "code": "<code>"}`.
 *
 * Not idempotent: a retried create makes a second coupon, so a workflow that
 * needs get-or-create must search for the code first.
 */
interface Input {
  name: string;
  code: string;
  discountType: string;
  status: string;
  discount?: number;
  launchDate?: string;
  expirationDate?: string;
  totalLimit?: number;
  usesLimit?: string;
  applicationLimit?: string;
  catalogLimit?: unknown;
  shippingLimit?: unknown;
  extraFields?: unknown;
}

const discountCouponCreate: ActionDefinition<Input> = {
  key: "discount-coupon-create",
  type: "perform",
  resource: "discount-coupon",
  title: "Create Discount Coupon",
  description: "Create a discount coupon with a code, a discount type and its limits.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Visible on the storefront, unlike the code.",
    },
    {
      key: "code",
      label: "Code",
      type: "string",
      required: true,
      hint: "What the customer types at the checkout to activate the coupon.",
    },
    {
      key: "discountType",
      label: "Discount type",
      type: "select",
      required: true,
      options: couponDiscountTypeOptions,
      default: "PERCENT",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: couponStatusOptions,
      default: "ACTIVE",
      hint: "`ACTIVE` makes the coupon usable immediately; the search filter for this same field " +
        "is called `availability`.",
    },
    {
      key: "discount",
      label: "Discount value",
      type: "number",
      validation: { min: 0 },
      hint: "An amount for `ABS`, a percentage for `PERCENT`. Not a money amount for the " +
        "shipping-only types.",
    },
    {
      key: "launchDate",
      label: "Launch date",
      type: "string",
      placeholder: "2026-06-06 08:00:00 +0400",
      hint: "When the coupon starts working. Any timezone offset is corrected to UTC+0.",
    },
    {
      key: "expirationDate",
      label: "Expiration date",
      type: "string",
      placeholder: "2026-06-30 23:59:59 +0400",
      hint: "When the coupon stops working, same format and same correction to UTC+0.",
    },
    {
      key: "totalLimit",
      label: "Minimum order subtotal",
      type: "number",
      validation: { min: 0 },
      advanced: true,
      hint: "The coupon only applies to orders at or above this subtotal.",
    },
    {
      key: "usesLimit",
      label: "Uses limit",
      type: "select",
      options: couponUsesLimitOptions,
      advanced: true,
    },
    {
      key: "applicationLimit",
      label: "Application limit",
      type: "select",
      options: couponApplicationLimitOptions,
      advanced: true,
    },
    {
      key: "catalogLimit",
      label: "Catalog limit",
      type: "json",
      advanced: true,
      hint: "Restricts the coupon to specific products/categories, e.g. " +
        '`{"products":[37208342],"categories":[]}`. Empty means every product and category.',
    },
    {
      key: "shippingLimit",
      label: "Shipping limit",
      type: "json",
      advanced: true,
      hint: "Restricts the coupon to specific shipping methods, e.g. " +
        '`{"shippingMethods":["5376-1635838180367"]}`. Empty means any method.',
    },
    extraFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "ID of the created coupon" },
    { key: "code", type: "string", label: "Code the coupon was created with" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      name: input.name,
      code: input.code,
      discountType: input.discountType,
      status: input.status,
      discount: input.discount,
      launchDate: input.launchDate,
      expirationDate: input.expirationDate,
      totalLimit: input.totalLimit,
      usesLimit: input.usesLimit,
      applicationLimit: input.applicationLimit,
      catalogLimit: input.catalogLimit,
      shippingLimit: input.shippingLimit,
    }, input.extraFields);
    return new EcwidClient(ctx).json("/discount_coupons", { method: "POST", body });
  },
};

export default discountCouponCreate;
