import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, type EcwidListPage } from "../lib/client.ts";
import {
  couponDiscountTypeOptions,
  couponStatusOptions,
  paginationParams,
  responseFieldsParam,
} from "../lib/params.ts";

/**
 * `GET /discount_coupons` — search discount coupons.
 *
 * Note the two filter names, which do **not** match the body field names on
 * create: the search filter for a coupon's type is `discount_type` (underscore,
 * unlike the body's `discountType`) and the filter for its state is
 * `availability` (the body calls the same thing `status`). Getting that wrong
 * returns an unfiltered page rather than an error, which is why they are spelled
 * out here.
 */
interface Input {
  code?: string;
  discount_type?: string;
  availability?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
  responseFields?: string;
}

const discountCouponSearch: ActionDefinition<Input> = {
  key: "discount-coupon-search",
  type: "search",
  resource: "discount-coupon",
  title: "Search Discount Coupons",
  description: "Search discount coupons by code, type, availability or creation date.",
  params: [
    {
      key: "code",
      label: "Code",
      type: "string",
      hint: "The coupon code customers type at the checkout.",
    },
    {
      key: "discount_type",
      label: "Discount type",
      type: "select",
      options: couponDiscountTypeOptions,
      hint: "The query param is `discount_type`; the request body spells the same field " +
        "`discountType`.",
    },
    {
      key: "availability",
      label: "Availability",
      type: "select",
      options: couponStatusOptions,
      hint: "The coupon's current state. On create the same field is called `status`.",
    },
    {
      key: "createdFrom",
      label: "Created from",
      type: "string",
      advanced: true,
      placeholder: "2026-01-15 00:00:00",
      hint: "UNIX timestamp or `YYYY-MM-DD HH:mm:ss`.",
    },
    {
      key: "createdTo",
      label: "Created until",
      type: "string",
      advanced: true,
      hint: "Upper bound on the creation date, same two formats.",
    },
    ...paginationParams(),
    responseFieldsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Discount coupons" },
    { key: "total", type: "number", label: "Total matching coupons" },
    { key: "count", type: "number", label: "Coupons in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size Ecwid used" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json<EcwidListPage<unknown>>("/discount_coupons", {
      query: {
        code: input.code,
        discount_type: input.discount_type,
        availability: input.availability,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
        limit: input.limit,
        offset: input.offset,
        responseFields: input.responseFields,
      },
    });
  },
};

export default discountCouponSearch;
