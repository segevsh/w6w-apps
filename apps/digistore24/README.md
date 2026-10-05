# Digistore24

Purchases, refunds and rebilling, buyers, products, affiliate commissions, vouchers, deliveries and
IPN connections on the **Digistore24 API** (vendor view).

- **Categories** — commerce
- **Auth methods** — api-key (`X-DS-API-KEY` header)
- **Actions** — 36
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `www.digistore24.com` (the `service` check adds `status.digistore24.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.digistore24.com/
- **API docs** — https://dev.digistore24.com/hc/ (help center) and https://digistore24.com/api/docs/index.html (Swagger UI)
- **OpenAPI** — https://digistore24.com/api/docs/openapi.yaml
- **Status page** — https://status.digistore24.com/

> Verified 2026-10-05 against the vendor's OpenAPI 3.0 document (plus its `paths/*.yaml`
> references), the help-center "API basics" and "Special data types" articles, and live probes of
> `www.digistore24.com` and `status.digistore24.com`. The icon is the vendor's own
> `https://www.digistore24.com/ds24-assets/favicon.svg`, used verbatim (1,750 bytes).

## Three things most likely to go wrong

### 1. Errors come back as HTTP 200

A missing key and an invalid key both answer **HTTP 200** with
`{"result":"error","message":"The API key is invalid.","code":2}`. Success is
`{"result":"success","data":{…}}`. So no part of this app decides anything from a status code: the client
([`lib/client.ts`](lib/client.ts)) throws on `result: "error"` whatever the status, and the auth `test`
and the `api` health check classify from the body too.

### 2. Transport: GET for reads, form-encoded POST for writes

The URL shape is `https://www.digistore24.com/api/call/<function>`, and the vendor documents that
arguments travel "as GET or POST parameters"; arrays use PHP bracket notation. The OpenAPI document
additionally lists `PUT` and `DELETE` verbs and JSON request bodies, but the help-center article is the
statement of how the endpoint actually reads its input, so this app uses only GET and POST, and nested
arguments become `search[email]=…`, `data[type]=…`, `tracking[0][tracking_id]=…`. Booleans are sent
as `Y`/`N` (both documented as accepted). Writes put arguments in the POST body, never in the URL.

### 3. A key is read-only or writable

An API key is created with a permission: `readonly`, `writable` or `developer` (can only mint keys for a
user; cannot read or write). Every read action works with a readonly key; refunds, rebilling changes
and every other write need a writable one. A developer key does not work with this app at all. The
auth `test` probes a read (`getUserInfo`), so a readonly key is a healthy connection.

The key travels only in the `X-DS-API-KEY` header, stamped by `sign`. Digistore24 also lets a key be put
in the URL path; that form is not used, because a workflow host logs URLs and not headers.

## Auth probe

`getUserInfo` returns `{user_id, user_name, granted_roles, granted_roles_msg}`: the account's own id,
login name and roles, and no key material. `ping` also rejects a bad key but returns only the server
time. `afterConnect` publishes `user_name` (and `user_id`) for the connection label and nothing else.

## Health checks

| Check | Probe | Notes |
| --- | --- | --- |
| `service` | `status.digistore24.com/api/v2/summary.json` | Real Atlassian Statuspage: page id `xzdmyb5vgf0p`, bogus sibling path answers 404 (not a catch-all). Two components, `Digistore24` and `Digibiz24` (a separate product); only the former is read, so a Digibiz24 incident does not report this API down. The page is pinned by id. |
| `api` | unsigned `GET /api/call/ping` | Answers 200 `{"result":"error","code":2,"message":"No API key given."}`. A schema-correct envelope proves reachability, so it is a pass; 5xx, markup or a network failure is `down`. |
| ~~`quota`~~ | none | Declared unavailable, `severity: "informational"`: no rate limit, header or usage endpoint is documented or observed. |
| `auth:api-key` | derived from `test` | |

## Actions

| Group | Actions |
| --- | --- |
| Account | `ping`, `get-user-info` |
| Purchases | `list-purchases`, `get-purchase`, `list-purchases-of-email`, `update-purchase`, `list-invoices`, `list-transactions` |
| Refunds and rebilling | `refund-purchase`, `refund-partially`, `refund-transaction`, `stop-rebilling`, `start-rebilling`, `resend-purchase-confirmation-mail` |
| Buyers | `list-buyers`, `get-buyer`, `update-buyer` |
| Products | `list-products`, `get-product`, `create-product`, `update-product` |
| Affiliates | `list-commissions`, `get-affiliate-commission`, `update-affiliate-commission` |
| Vouchers | `list-vouchers`, `get-voucher`, `create-voucher`, `update-voucher`, `delete-voucher` |
| Deliveries | `list-deliveries`, `get-delivery`, `update-delivery` |
| IPN | `ipn-info`, `ipn-setup`, `ipn-delete` |
| Statistics | `stats-sales-summary` |

Each action returns the response's `data` object unchanged; where the vendor answers with a bare
array it is returned as `{ items: [...] }`. Time arguments accept the vendor's formats
(`2014-02-28 23:11:24`, ISO 8601, or relative `-3d`, `-24h`, `now`).

**Idempotency.** Refunds, product and voucher creation, and the confirmation mail are `idempotent:
false` (a retry repeats the side effect). Updates, rebilling start/stop, deletes and IPN
setup/teardown are `true`: repeating them ends in the same state.

**Product properties.** `create-product` takes a JSON `data` object and `update-product` a JSON
`fields` object, because a product has roughly 80 properties (see `createProduct` in the API
reference). The OpenAPI document sends `createProduct`'s properties under the argument `data` but
`updateProduct`'s as top-level arguments; this app follows that document for both.

**Not exposed.** `update-voucher` cannot rename a voucher: the OpenAPI document uses the name `code`
both for the identifier and for the new value, which are indistinguishable on the wire.

## Not covered (107 functions)

Left out to keep a coherent core; none was skipped because it could not be verified:

`addBalanceToPurchase`, `approveProduct`, `copyProduct`, `logMemberAccess`, `createAnalyticsToken`, 
`createBillingOnDemand`, `createAddon`, `createAddonChangePurchase`, `createBuyUrl`, `createImage`, 
`createJointVenture`, `createEticket`, `createOrderform`, `createPaymentplan`, 
`createProductGroup`, `createShippingCostPolicy`, `createSocialProofBubble`, `createUpgrade`, 
`createUpsellBuyButton`, `createUpgradePurchase`, `createMarketplaceEntry`, `deleteBuyUrl`, 
`deleteImage`, `deleteOrderform`, `deletePaymentplan`, `deleteProduct`, `deleteProductGroup`, 
`deleteShippingCostPolicy`, `deleteUpgrade`, `deleteUpsells`, `deleteMarketplaceEntry`, 
`getEticket`, `getEticketSettings`, `getGlobalSettings`, `getImage`, `getMarketplaceEntry`, 
`getServiceProofRequest`, `getOrderform`, `getOrderformMetas`, `getProductAddons`, `getSplittests`, 
`getProductGroup`, `getShippingCostPolicy`, `getCustomerToAffiliateBuyerDetails`, 
`getPurchaseTracking`, `getPurchaseDownloads`, `getReferringAffiliate`, `getSmartupgrade`, 
`getUpgrade`, `getUpsells`, `listAccountAccess`, `listBuyUrls`, `listConversionTools`, 
`listCountries`, `listCurrencies`, `listEticketLocations`, `listCustomFormRecords`, 
`listEticketTemplates`, `listServiceProofRequests`, `listEtickets`, `listImages`, 
`listMarketplaceEntries`, `listOrderforms`, `listPaymentPlans`, `listPayouts`, `listProductGroups`, 
`listShippingCostPolicies`, `listProductTypes`, `listRebillingStatusChanges`, `listSmartUpgrades`, 
`listUpgrades`, `getAffiliateForEmail`, `createRebillingPayment`, `renderJsTrackingCode`, 
`reportFraud`, `requestApiKey`, `requestMarketplaceEntryApproval`, `resendInvoiceMail`, 
`retrieveApiKey`, `setAffiliateForEmail`, `setReferringAffiliate`, `statsAffiliateToplist`, 
`statsClicksAndEarningsByDateAndCampaignKey`, `statsDailyAmounts`, `statsExpectedPayouts`, 
`statsMarketplace`, `statsSales`, `unregister`, `updateAddon`, `updateJointVenture`, 
`updateOrderform`, `updatePaymentplan`, `updateProductGroup`, `updateServiceProofRequest`, 
`updateShippingCostPolicy`, `updateSocialProofBubble`, `updateUpsells`, `updateUpsellBuyButton`, 
`{productId}/legal-requirements`, `deliverable-types`, `updateProductResellerApproval`, 
`validateAffiliate`, `validateCouponCode`, `validateEticket`, `validateLicenseKey`, 
`createOnboardingProduct`, `getOnboardingAccountStatus`

## Tests

`deno task test` — 164 tests with a mocked `HookContext` (fake `ctx.fetch`, no-op `ctx.log`): every
action's wire name, method and encoding, the HTTP-200 error envelope, the client's bracket-notation
flattening, the auth probe and its rejection classification, and all three health checks.
