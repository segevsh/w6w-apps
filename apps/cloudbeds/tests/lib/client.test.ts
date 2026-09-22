import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  CloudbedsClient,
  compact,
  encodeForm,
  formatCloudbedsError,
  formatCloudbedsFailure,
  readCloudbedsError,
} from "../../lib/client.ts";
import {
  API_ROOT,
  errorBody,
  failureEnvelope,
  formOf,
  mockCtx,
  pathOf,
  queryOf,
} from "../_helpers.ts";

Deno.test("client: request builds the documented base URL and path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await new CloudbedsClient(ctx).request("/getHotels");
  assertEquals(calls[0].url, `${API_ROOT}/getHotels`);
});

Deno.test("client: query params are compacted — undefined/null/empty are dropped, false and 0 survive", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await new CloudbedsClient(ctx).request("/getRoomTypes", {
    query: {
      propertyIDs: "37",
      detailedRates: false,
      pageNumber: 0,
      roomTypeIDs: undefined,
      foo: null,
      bar: "",
    },
  });
  assertEquals(queryOf(calls[0].url), {
    propertyIDs: "37",
    detailedRates: "false",
    pageNumber: "0",
  });
});

/**
 * The whole reason this file exists. Cloudbeds documents (and this was
 * verified live) that some failures answer HTTP 200 with `{"success": false,
 * "message": "…"}` — a deactivated approving user, an inactive property, a
 * token that does not cover the requested property. `res.ok` alone would
 * treat every one of these as success.
 */
Deno.test("client: an HTTP-200 body with success:false throws, not returns", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: failureEnvelope("User who approved this connection is not active anymore"),
    },
  ]);
  const err = await assertRejects(
    () => new CloudbedsClient(ctx).request("/getReservations"),
    Error,
  );
  assert(err.message.includes("HTTP 200"), err.message);
  assert(
    err.message.includes("User who approved this connection is not active anymore"),
    err.message,
  );
});

Deno.test("client: success:false at the string level ('false' as a string) is not mistaken for the boolean", async () => {
  // GetMetadataResponse types `success` as a *string* per the vendor's own schema.
  // The check is `=== false`, so a truthy non-empty string must NOT be treated as a failure.
  const { ctx } = mockCtx([{ body: { success: "true", data: { api: { url: "x" } } } }]);
  const body = await new CloudbedsClient(ctx).request("/oauth/metadata") as { success: string };
  assertEquals(body.success, "true");
});

Deno.test("client: a real 2xx with success:true passes through untouched", async () => {
  const { ctx } = mockCtx([{
    body: { success: true, data: [{ propertyID: "1" }], count: 1, total: 1 },
  }]);
  const body = await new CloudbedsClient(ctx).request<
    { success: boolean; data: unknown[]; count: number; total: number }
  >(
    "/getHotels",
  );
  assertEquals(body, { success: true, data: [{ propertyID: "1" }], count: 1, total: 1 });
});

Deno.test("client: data() unwraps the envelope's data member", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: { propertyID: "1" } } }]);
  const data = await new CloudbedsClient(ctx).data("/getHotelDetails");
  assertEquals(data, { propertyID: "1" });
});

Deno.test("client: a 401 throws with the vendor's hint surfaced", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("access_denied", { hint: 'Missing "Authorization" header' }) },
  ]);
  const err = await assertRejects(() => new CloudbedsClient(ctx).request("/getHotels"), Error);
  assert(err.message.includes("access_denied"), err.message);
  assert(err.message.includes('Missing "Authorization" header'), err.message);
});

Deno.test("client: a write sends a form-encoded body, never JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new CloudbedsClient(ctx).request("/postReservation", {
    method: "POST",
    body: { propertyID: "1", guestFirstName: "Ada" },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(formOf(calls[0].body), { propertyID: "1", guestFirstName: "Ada" });
});

Deno.test("client: encodeForm renders a list of records in PHP bracket notation", () => {
  const body = encodeForm({
    propertyID: "1",
    rooms: [{ roomTypeID: "rt1", quantity: 2 }, { roomTypeID: "rt2", quantity: 1 }],
  });
  const params = new URLSearchParams(body);
  assertEquals(params.get("propertyID"), "1");
  assertEquals(params.get("rooms[0][roomTypeID]"), "rt1");
  assertEquals(params.get("rooms[0][quantity]"), "2");
  assertEquals(params.get("rooms[1][roomTypeID]"), "rt2");
});

Deno.test("client: compact drops undefined/null/empty but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("client: readCloudbedsError parses the documented 4xx envelope", () => {
  const parsed = readCloudbedsError(
    JSON.stringify({ error: "access_denied", hint: "Access token is invalid" }),
  );
  assertEquals(parsed, {
    error: "access_denied",
    hint: "Access token is invalid",
    error_description: undefined,
    message: undefined,
  });
});

Deno.test("client: readCloudbedsError returns {} for a non-JSON body rather than throwing", () => {
  assertEquals(readCloudbedsError("<html>not json</html>"), {});
});

Deno.test("client: formatCloudbedsError prefers hint over error_description", () => {
  const msg = formatCloudbedsError(
    401,
    "GET",
    "/getHotels",
    JSON.stringify({
      error: "access_denied",
      error_description: "The resource owner or authorization server denied the request.",
      hint: 'Missing "Authorization" header',
    }),
  );
  assert(msg.includes('Missing "Authorization" header'), msg);
});

Deno.test("client: formatCloudbedsFailure names the HTTP-200 quirk explicitly", () => {
  const msg = formatCloudbedsFailure("GET", "/getReservations", "property is no longer active");
  assert(msg.includes("HTTP 200"), msg);
  assert(msg.includes("property is no longer active"), msg);
});

Deno.test("client: a non-JSON 2xx body raises a clear error instead of a JSON.parse crash", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>edge proxy page</html>" }]);
  const err = await assertRejects(() => new CloudbedsClient(ctx).request("/getHotels"), Error);
  assert(err.message.includes("did not return JSON"), err.message);
});

Deno.test("client: pathOf/queryOf test helpers parse a recorded call correctly", () => {
  assertEquals(pathOf(`${API_ROOT}/getHotels?a=1`), "/api/v1.3/getHotels");
  assertEquals(queryOf(`${API_ROOT}/getHotels?a=1&b=2`), { a: "1", b: "2" });
});
