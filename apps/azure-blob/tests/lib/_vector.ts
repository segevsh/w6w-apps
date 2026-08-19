/**
 * Reference vectors for Shared Key signing, computed **independently** — in
 * Python, from Microsoft's documented string-to-sign format, not from this
 * app's code.
 *
 * The GET vector's string-to-sign is byte-identical in shape to the worked
 * example in Microsoft's own documentation:
 *
 *     GET\n\n\n\n\n\n\n\n\n\n\n\nx-ms-date:…\nx-ms-version:…\n/myaccount/mycontainer\ncomp:…
 *
 * If `lib/signing.ts` drifts — a line dropped from the twelve, headers sorted
 * differently, the query left encoded, the key used as text rather than
 * decoded — these fail even though the code would still be self-consistent.
 *
 * The key is 32 bytes of ASCII, base64-encoded. It has never protected
 * anything.
 */
export const TEST_ACCOUNT = "myaccount";
export const TEST_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
export const TEST_DATE = "Fri, 26 Jun 2015 23:39:12 GMT";

/**
 * GET /mycontainer?restype=container&comp=list&timeout=20
 * with x-ms-date and x-ms-version: 2015-02-21.
 */
export const EXPECTED_GET_SIGNATURE = "xFJ0EorGz6lq3mpNXlVFncGCj5JJteiOYwp/ogg41RQ=";

/**
 * PUT /mycontainer/hello.txt with an 11-byte text/plain body,
 * x-ms-blob-type: BlockBlob and x-ms-version: 2021-12-02 — the case that
 * exercises the Content-Length and Content-Type lines.
 */
export const EXPECTED_PUT_SIGNATURE = "ZTwqNJzYWKfs8N+7xYo/hDQeRCWMjd74WrTw0APLoeY=";
