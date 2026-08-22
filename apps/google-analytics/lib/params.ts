import type { Param } from "@w6w/types";

/**
 * The GA4 property a call is addressed to is a path segment, so unlike a
 * header-borne credential it has to be visible to actions. It is collected once
 * at connect time and published to `connection.display`; this param is the
 * per-call override, because one OAuth grant commonly reaches many properties.
 * Same shape as `customerId` in this pack's `google-ads` app.
 */
export const PROPERTY_PARAM: Param = {
  key: "propertyId",
  label: "Property ID",
  type: "string",
  default: "",
  placeholder: "123456789",
  hint: "Leave blank to use the property on the connection. `properties/` prefix optional.",
};

/** The two params every Admin list action shares. */
export const LIST_PARAMS: Param[] = [
  { key: "returnAll", label: "Return All", type: "boolean", default: false },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max number of results when Return All is off.",
  },
];

/** Dimensions and metrics, as the comma-separated lists a form can carry. */
export const DIMENSIONS_PARAM: Param = {
  key: "dimensions",
  label: "Dimensions",
  type: "string",
  default: "",
  placeholder: "date,country",
  hint: "Comma-separated GA4 dimension API names. Use Get metadata to list what a property has.",
};

export const METRICS_PARAM: Param = {
  key: "metrics",
  label: "Metrics",
  type: "string",
  default: "",
  placeholder: "activeUsers,sessions",
  hint: "Comma-separated GA4 metric API names.",
};

/**
 * Filters are `FilterExpression` trees — nested and/or/not with typed value
 * matchers — so they are passed as JSON rather than flattened into fields that
 * could only express the simplest case.
 */
export const DIMENSION_FILTER_PARAM: Param = {
  key: "dimensionFilter",
  label: "Dimension Filter",
  type: "json",
  default: "",
  placeholder: '{"filter":{"fieldName":"country","stringFilter":{"value":"Japan"}}}',
  hint: "A GA4 FilterExpression. Applied before aggregation.",
};

export const METRIC_FILTER_PARAM: Param = {
  key: "metricFilter",
  label: "Metric Filter",
  type: "json",
  default: "",
  hint: "A GA4 FilterExpression. Applied after aggregation.",
};

export const ORDER_BYS_PARAM: Param = {
  key: "orderBys",
  label: "Order By",
  type: "json",
  default: "",
  placeholder: '[{"metric":{"metricName":"sessions"},"desc":true}]',
  hint: "A GA4 OrderBy array.",
};
