import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/offer-update.ts";

Deno.test("offer-update: PUT /3/offers/{documentNumber} with a wrapped body", async () => {
  const reply = { "Offer": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 200, body: reply }]);
  const result = await action.execute!({
    "documentNumber": "documentNumber-v",
    "offerDate": "offerDate-v",
    "expireDate": "expireDate-v",
    "currency": "currency-v",
    "yourReference": "yourReference-v",
    "ourReference": "ourReference-v",
    "termsOfPayment": "termsOfPayment-v",
    "termsOfDelivery": "termsOfDelivery-v",
    "wayOfDelivery": "wayOfDelivery-v",
    "project": "project-v",
    "costCenter": "costCenter-v",
    "remarks": "remarks-v",
    "comments": "comments-v",
    "vatIncluded": true,
    "notCompleted": true,
    "offerRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/3/offers/documentNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Offer: {
      "OfferDate": "offerDate-v",
      "ExpireDate": "expireDate-v",
      "Currency": "currency-v",
      "YourReference": "yourReference-v",
      "OurReference": "ourReference-v",
      "TermsOfPayment": "termsOfPayment-v",
      "TermsOfDelivery": "termsOfDelivery-v",
      "WayOfDelivery": "wayOfDelivery-v",
      "Project": "project-v",
      "CostCenter": "costCenter-v",
      "Remarks": "remarks-v",
      "Comments": "extra",
      "VATIncluded": true,
      "NotCompleted": true,
      "OfferRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "documentNumber": "documentNumber-v" } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Offer: {} });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("offer-update: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "documentNumber": "documentNumber-v", "additionalFields": "[1]" } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
