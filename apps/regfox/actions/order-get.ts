import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/orders/{id}?product=` */
export default getAction({
  key: "order-get",
  segment: "orders",
  noun: "order",
  idKey: "orderId",
  idLabel: "Order ID",
  expand: ["registrants", "tickets", "transactions"],
});
