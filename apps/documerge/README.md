# DocuMerge

[DocuMerge](https://documerge.ai) generates documents (PDF, Word, Excel, HTML, images, email) by
merging data into templates. This app lets a workflow manage documents and routes, their fields and
delivery methods, queue merges, and run the PDF tools, over the REST API at
`https://app.documerge.ai`.

- **App id:** `io.w6w.documerge`
- **Auth:** API token, sent as `Authorization: Bearer <token>` (`auth/api-token.ts`). Create it in
  DocuMerge under the profile menu > API Tokens.
- **Network:** `app.documerge.ai` only.
- **Spec source:** <https://app.documerge.ai/api-docs/openapi.yaml> (OpenAPI 3.0.3, with a Postman
  collection beside it), verified 2026-10-06 plus live probes. The reference was last regenerated
  March 2024 and carries no deprecation notices.
- **Icon:** the vendor's own mark, `logo-fav-250-250.svg`, from
  <https://documerge.ai/wp-content/uploads/2024/02/logo-fav-250-250.svg> (linked from the
  homepage), byte-for-byte.

## Actions (36)

| Action | Endpoint |
| --- | --- |
| `document-copy` | `POST /api/documents/copy/{documentId}` |
| `document-create` | `POST /api/documents` |
| `document-delete` | `DELETE /api/documents/{documentId}` |
| `document-delivery-method-create` | `POST /api/documents/delivery-methods/{documentId}` |
| `document-delivery-method-delete` | `DELETE /api/documents/delivery-methods/{documentId}/{deliveryMethodId}` |
| `document-delivery-method-list` | `GET /api/documents/delivery-methods/{documentId}` |
| `document-delivery-method-update` | `PUT /api/documents/delivery-methods/{documentId}/{deliveryMethodId}` |
| `document-field-create` | `POST /api/documents/fields/{documentId}` |
| `document-field-delete` | `DELETE /api/documents/fields/{documentId}/{fieldId}` |
| `document-field-list` | `GET /api/documents/fields/{documentId}` |
| `document-field-update` | `PUT /api/documents/fields/{documentId}/{fieldId}` |
| `document-file-get` | `GET /api/documents/files/{documentId}` |
| `document-get` | `GET /api/documents/{documentId}` |
| `document-list` | `GET /api/documents` |
| `document-merge` | `POST /api/documents/merge/{key}` |
| `document-update` | `PUT /api/documents/{documentId}` |
| `route-create` | `POST /api/routes` |
| `route-delete` | `DELETE /api/routes/{routeId}` |
| `route-delivery-method-create` | `POST /api/routes/delivery-methods/{routeId}` |
| `route-delivery-method-delete` | `DELETE /api/routes/delivery-methods/{routeId}/{deliveryMethodId}` |
| `route-delivery-method-list` | `GET /api/routes/delivery-methods/{routeId}` |
| `route-delivery-method-update` | `PUT /api/routes/delivery-methods/{routeId}/{deliveryMethodId}` |
| `route-field-create` | `POST /api/routes/fields/{routeId}` |
| `route-field-delete` | `DELETE /api/routes/fields/{routeId}/{fieldId}` |
| `route-field-list` | `GET /api/routes/fields/{routeId}` |
| `route-field-update` | `PUT /api/routes/fields/{routeId}/{fieldId}` |
| `route-get` | `GET /api/routes/{routeId}` |
| `route-list` | `GET /api/routes` |
| `route-merge` | `POST /api/routes/merge/{key}` |
| `route-rule-list` | `GET /api/routes/{routeId}/rules` |
| `route-update` | `PUT /api/routes/{routeId}` |
| `tool-combine` | `POST /api/tools/combine` |
| `tool-pdf-compress` | `POST /api/tools/pdf/compress` |
| `tool-pdf-convert` | `POST /api/tools/pdf/convert` |
| `tool-pdf-encrypt` | `POST /api/tools/pdf/encrypt` |
| `tool-pdf-split` | `POST /api/tools/pdf/split` |

Every endpoint in the vendor's reference is covered.

## Behaviour worth knowing

- **Merge is by key, and queued.** `document-merge` and `route-merge` take the document's or
  route's `key` (a short string on the record), not its numeric id. DocuMerge answers
  `Document merge queued!` as `text/plain`; the produced file goes to the delivery methods, it is
  not in the response.
- **The reference documents no request body for the merge endpoints.** The `data` parameter is sent
  verbatim as the JSON body (field values keyed by field name). This is the one action whose body
  could not be confirmed from the spec; check it against a real document before relying on it.
- **Tools return files as bytes.** `tool-*` actions return `{contentBase64, contentType, size}`.
  Input files are `{name, url}` or `{name, contents}` (base64).
- **Updates are full replacements.** `document-update` needs name, type and output every time;
  `route-update` needs the name; field and delivery-method updates need their required fields too.
- **Bad tokens.** A missing and a wrong token both answer `401 {"message":"Unauthenticated."}`.
  The credential check reads that body, not the status. Validation failures are
  `{"message", "errors": {field: [...]}}` and are folded into the error text.
- **No pagination or rate-limit headers** are documented or observed; list actions return whatever
  `data` the API sends.

## Health checks

- `api` — unsigned `GET /api/documents`; the documented 401 `Unauthenticated.` body passes
  (reachability), a 5xx is down, HTML is degraded.
- `service` — declared unavailable at `informational` severity. DocuMerge publishes no status page:
  `status.documerge.ai` does not resolve and `documerge.statuspage.io` answers the 127,718-byte
  unclaimed-Statuspage HTML shell for its feed.
- `auth:api-token` — derived from the auth `test` hook (`GET /api/documents`, requiring the `data`
  envelope).
- No quota check: no balance or rate-limit endpoint or header exists.
