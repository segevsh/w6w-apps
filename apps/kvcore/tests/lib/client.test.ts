import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, flattenKvCoreErrors, formatKvCoreError, KvCoreClient } from "../../lib/client.ts";
import { errorsBody, mockCtx, pathOf, queryOf, validationErrorsBody } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty-string values only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("flattenKvCoreErrors: a flat array passes through", () => {
  assertEquals(flattenKvCoreErrors(["Authentication Failed"]), ["Authentication Failed"]);
});

Deno.test("flattenKvCoreErrors: a Laravel-style validation map is field-prefixed", () => {
  assertEquals(
    flattenKvCoreErrors({
      email: ["The email has already been taken."],
      name: ["The name field is required."],
    }),
    ["email: The email has already been taken.", "name: The name field is required."],
  );
});

Deno.test("flattenKvCoreErrors: undefined is an empty list", () => {
  assertEquals(flattenKvCoreErrors(undefined), []);
});

Deno.test("formatKvCoreError: renders the flat-array shape", () => {
  const msg = formatKvCoreError(
    401,
    "GET",
    "/v2/public/contacts",
    JSON.stringify(errorsBody("Authentication Failed")),
  );
  assertEquals(msg, "kvCORE 401 for GET /v2/public/contacts: Authentication Failed");
});

Deno.test("formatKvCoreError: renders the validation-map shape", () => {
  const msg = formatKvCoreError(
    422,
    "POST",
    "/v2/public/user",
    JSON.stringify(validationErrorsBody({ email: ["The email has already been taken."] })),
  );
  assert(msg.includes("email: The email has already been taken."), msg);
});

Deno.test("formatKvCoreError: a non-JSON body is truncated, not thrown on", () => {
  const msg = formatKvCoreError(500, "GET", "/v2/public/users", "<html>upstream error</html>");
  assert(msg.includes("<html>upstream error</html>"), msg);
});

Deno.test("KvCoreClient: sends the required Content-Type header and JSON-encodes the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new KvCoreClient(ctx).json("/contact", { method: "POST", body: { first_name: "A" } });

  assertEquals(pathOf(calls[0].url), "/v2/public/contact");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ first_name: "A" }));
});

/**
 * kvCORE's array-valued filters (`filter[status][]`, `offices[]`, …) are
 * documented as a REPEATED query key, not one comma-joined value — the
 * opposite convention from this pack's Apify app. Getting this wrong
 * silently returns zero matches rather than an error.
 */
Deno.test("KvCoreClient: array query values are sent as a repeated key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new KvCoreClient(ctx).json("/contacts", {
    query: { "filter[status][]": ["0", "7"] },
  });

  assertEquals(queryOf(calls[0].url), { "filter[status][]": ["0", "7"] });
});

Deno.test("KvCoreClient: a non-ok response throws with the formatted message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorsBody("Authentication Failed") }]);
  await assertRejects(
    () => new KvCoreClient(ctx).json("/contacts"),
    Error,
    "Authentication Failed",
  );
});

Deno.test("KvCoreClient: a 204 response with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new KvCoreClient(ctx).json("/office/1"), undefined);
});
