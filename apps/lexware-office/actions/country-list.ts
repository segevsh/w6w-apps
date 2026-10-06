import { listAction } from "../lib/factory.ts";

/** `GET /v1/countries` — bare array of `{countryCode, countryNameEN, countryNameDE, taxClassification}`. */
export default listAction({
  key: "country-list",
  title: "List Countries",
  description: "Countries known to Lexware with their tax classification (de, intraCommunity, " +
    "thirdPartyCountry). Use the country code on addresses.",
  resource: "country",
  path: "/countries",
  paged: false,
});
