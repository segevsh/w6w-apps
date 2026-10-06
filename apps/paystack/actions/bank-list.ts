import { listAction, paginationParams } from "../lib/factory.ts";

/** `GET /bank` — the `code` of each bank is what Create Transfer Recipient wants. */
export default listAction({
  key: "bank-list",
  title: "List Banks",
  description: "List banks and mobile-money providers for a country or currency.",
  resource: "bank",
  path: "/bank",
  query: { country: "country", currency: "currency", type: "type" },
  params: [
    {
      key: "country",
      label: "Country",
      type: "select",
      options: ["ghana", "kenya", "nigeria", "south africa"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: ["GHS", "KES", "NGN", "ZAR"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["ghipps", "mobile_money", "nuban", "kepss", "basa"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    ...paginationParams,
  ],
});
