import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  collectionParent,
  databaseName,
  decodeDocument,
  decodeFields,
  describeGoogleError,
  documentIdOf,
  documentName,
  documentsRoot,
  encodeFields,
  FirestoreClient,
  fromValue,
  parseGoogleError,
  parseJson,
  pathSegments,
  toValue,
} from "../../lib/client.ts";

// ------------------------------------------------------------------ paths --

Deno.test("client: a database name and the documents root are assembled once", () => {
  assertEquals(databaseName("p1", "(default)"), "projects/p1/databases/(default)");
  assertEquals(
    documentsRoot("p1", "(default)"),
    "projects/p1/databases/(default)/documents",
  );
});

Deno.test("client: a document path has an even segment count, and is joined verbatim", () => {
  assertEquals(
    documentName("p1", "(default)", "users/alice"),
    "projects/p1/databases/(default)/documents/users/alice",
  );
  assertEquals(
    documentName("p1", "(default)", "users/alice/orders/o1"),
    "projects/p1/databases/(default)/documents/users/alice/orders/o1",
  );
  // Leading/trailing slashes are tolerated; an odd count names a collection.
  assertEquals(
    documentName("p1", "(default)", "/users/alice/"),
    "projects/p1/databases/(default)/documents/users/alice",
  );
  const err = assertThrows(() => documentName("p1", "(default)", "users"), Error);
  assert(err.message.includes("collection"), err.message);
  assertThrows(() => documentName("p1", "(default)", ""), Error, "`path` is required");
});

Deno.test("client: a full resource name is passed through, not re-prefixed", () => {
  const name = "projects/other/databases/named/documents/users/alice";
  assertEquals(documentName("p1", "(default)", name), name);
});

Deno.test("client: collectionParent splits the id off the end of a collection path", () => {
  const root = documentsRoot("p1", "(default)");
  assertEquals(collectionParent("p1", "(default)", "users"), {
    parent: root,
    collectionId: "users",
  });
  assertEquals(collectionParent("p1", "(default)", "users/alice/orders"), {
    parent: `${root}/users/alice`,
    collectionId: "orders",
  });
  const err = assertThrows(() => collectionParent("p1", "(default)", "users/alice"), Error);
  assert(err.message.includes("odd number"), err.message);
  assertThrows(() => collectionParent("p1", "(default)", ""), Error);
});

Deno.test("client: pathSegments drops empties and trims", () => {
  assertEquals(pathSegments(" users / alice / / o1 "), ["users", "alice", "o1"]);
  assertEquals(pathSegments(""), []);
});

Deno.test("client: documentIdOf is the last segment", () => {
  assertEquals(documentIdOf("projects/p/databases/d/documents/users/alice"), "alice");
  assertEquals(documentIdOf(undefined), undefined);
});

// ---------------------------------------------------------------- toValue --

Deno.test("toValue: the obvious JS mapping, with int64 string-encoded", () => {
  assertEquals(toValue("ada"), { stringValue: "ada" });
  assertEquals(toValue(true), { booleanValue: true });
  assertEquals(toValue(false), { booleanValue: false });
  // int64 does not fit a JSON number, so Firestore spells it as a string.
  assertEquals(toValue(36), { integerValue: "36" });
  assertEquals(toValue(-7), { integerValue: "-7" });
  assertEquals(toValue(1.5), { doubleValue: 1.5 });
  assertEquals(toValue(null), { nullValue: null });
  assertEquals(toValue(undefined), { nullValue: null });
});

Deno.test("toValue: arrays become arrayValue, objects become mapValue", () => {
  assertEquals(toValue([1, "two"]), {
    arrayValue: { values: [{ integerValue: "1" }, { stringValue: "two" }] },
  });
  assertEquals(toValue({ a: 1 }), { mapValue: { fields: { a: { integerValue: "1" } } } });
  assertEquals(toValue({ nested: { ok: true } }), {
    mapValue: { fields: { nested: { mapValue: { fields: { ok: { booleanValue: true } } } } } },
  });
  assertEquals(toValue([]), { arrayValue: { values: [] } });
});

Deno.test("toValue: a single-key typed object is passed through already-typed", () => {
  assertEquals(toValue({ timestampValue: "2026-09-22T10:00:00Z" }), {
    timestampValue: "2026-09-22T10:00:00Z",
  });
  assertEquals(toValue({ geoPointValue: { latitude: 51.5, longitude: -0.1 } }), {
    geoPointValue: { latitude: 51.5, longitude: -0.1 },
  });
  assertEquals(
    toValue({ referenceValue: "projects/p/databases/d/documents/users/alice" }),
    { referenceValue: "projects/p/databases/d/documents/users/alice" },
  );
  // int64 supplied as a string survives beyond 2^53.
  assertEquals(toValue({ integerValue: "9223372036854775807" }), {
    integerValue: "9223372036854775807",
  });
  assertEquals(toValue({ bytesValue: "aGk=" }), { bytesValue: "aGk=" });
  // A geoPoint given as a JSON string (a form field) is parsed.
  assertEquals(toValue({ geoPointValue: '{"latitude":1,"longitude":2}' }), {
    geoPointValue: { latitude: 1, longitude: 2 },
  });
});

Deno.test("toValue: a two-key object is a map even if one key looks like a type", () => {
  // The single-key rule is what disambiguates; two keys cannot be a leaf.
  assertEquals(toValue({ stringValue: "x", other: 1 }), {
    mapValue: {
      fields: { stringValue: { stringValue: "x" }, other: { integerValue: "1" } },
    },
  });
});

Deno.test("toValue: rejects what Firestore cannot store", () => {
  assertThrows(() => toValue(NaN), Error, "NaN");
  assertThrows(() => toValue(Infinity), Error, "NaN");
  assertThrows(() => toValue({ integerValue: "1.5" }), Error, "whole number");
  assertThrows(() => toValue({ geoPointValue: { latitude: "x" } }), Error, "latitude");
});

// -------------------------------------------------------------- fromValue --

Deno.test("fromValue: the obvious JS mapping", () => {
  assertEquals(fromValue({ stringValue: "ada" }), "ada");
  assertEquals(fromValue({ booleanValue: false }), false);
  assertEquals(fromValue({ doubleValue: 1.5 }), 1.5);
  assertEquals(fromValue({ nullValue: null }), null);
  assertEquals(fromValue(undefined), null);
});

/** An int64 becomes a number only when that is lossless. */
Deno.test("fromValue: int64 is a number while safe, the string beyond it", () => {
  assertEquals(fromValue({ integerValue: "36" }), 36);
  assertEquals(fromValue({ integerValue: "-7" }), -7);
  assertEquals(fromValue({ integerValue: "9007199254740993" }), "9007199254740993");
});

Deno.test("fromValue: timestamps, bytes and references stay the wire strings", () => {
  assertEquals(fromValue({ timestampValue: "2026-09-22T10:00:00Z" }), "2026-09-22T10:00:00Z");
  assertEquals(fromValue({ bytesValue: "aGk=" }), "aGk=");
  assertEquals(
    fromValue({ referenceValue: "projects/p/databases/d/documents/users/alice" }),
    "projects/p/databases/d/documents/users/alice",
  );
  assertEquals(fromValue({ geoPointValue: { latitude: 1, longitude: 2 } }), {
    latitude: 1,
    longitude: 2,
  });
});

Deno.test("fromValue: arrays and maps recurse", () => {
  assertEquals(
    fromValue({ arrayValue: { values: [{ integerValue: "1" }, { stringValue: "x" }] } }),
    [
      1,
      "x",
    ],
  );
  assertEquals(
    fromValue({ mapValue: { fields: { a: { booleanValue: true } } } }),
    { a: true },
  );
  assertEquals(fromValue({ arrayValue: {} }), []);
});

Deno.test("fromValue: a leaf this app does not know is returned, not dropped", () => {
  // A pipeline-only arm is still visible rather than silently null.
  assertEquals(fromValue({ pipelineValue: { stages: [] } } as never), {
    pipelineValue: { stages: [] },
  });
});

Deno.test("encodeFields / decodeFields: a document's fields round-trip", () => {
  const plain = {
    name: "Ada",
    age: 36,
    score: 1.5,
    active: true,
    tags: ["a", "b"],
    address: { city: "London", geo: { latitude: 51.5, longitude: -0.1 } },
    at: { timestampValue: "2026-09-22T10:00:00Z" },
  };
  const encoded = encodeFields(plain);
  assertEquals(encoded.age, { integerValue: "36" });
  // A typed envelope decodes to its plain JS equivalent, not back to the
  // wrapper — that is the one asymmetry of the two directions.
  assertEquals(decodeFields(encoded), { ...plain, at: "2026-09-22T10:00:00Z" });
  // `undefined` is skipped rather than encoded as null.
  assertEquals(encodeFields({ a: undefined, b: 1 }), { b: { integerValue: "1" } });
  assertEquals(decodeFields(undefined), {});
});

Deno.test("decodeDocument: keeps the raw fields and adds decoded `data`", () => {
  const doc = {
    name: "projects/p/databases/d/documents/users/alice",
    fields: { age: { integerValue: "36" } },
    createTime: "2026-09-22T00:00:00Z",
    updateTime: "2026-09-22T00:00:01Z",
  };
  assertEquals(decodeDocument(doc), {
    ...doc,
    data: { age: 36 },
  });
  assertEquals(decodeDocument(undefined), {});
});

Deno.test("parseJson: a live object passes through, a bad string throws", () => {
  assertEquals(parseJson('{"a":1}', "data"), { a: 1 });
  assertEquals(parseJson({ a: 1 }, "data"), { a: 1 });
  assertEquals(parseJson("", "data"), undefined);
  assertThrows(() => parseJson("{oops", "data"), Error, "`data`");
});

// ----------------------------------------------------------------- errors --

Deno.test("parseGoogleError / describeGoogleError: the body decides, not the status", () => {
  const body = JSON.stringify({
    error: {
      code: 403,
      message: "The caller does not have permission",
      status: "PERMISSION_DENIED",
    },
  });
  assertEquals(parseGoogleError(body)?.status, "PERMISSION_DENIED");
  const described = describeGoogleError(403, "Forbidden", body);
  assert(described.includes("PERMISSION_DENIED"), described);
  assert(described.includes("does not have permission"), described);
  // A body that is not the envelope falls back to status + a truncated body.
  assert(describeGoogleError(500, "Server Error", "<html>nope</html>").includes("HTTP 500"));
  assertEquals(parseGoogleError("<html>"), undefined);
});

// ----------------------------------------------------------------- client --

Deno.test("client: repeated query params are appended, and errors carry the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { documents: [] } },
    {
      status: 404,
      body: {
        error: {
          code: 404,
          message: "Document not found.",
          status: "NOT_FOUND",
        },
      },
    },
  ]);
  const client = new FirestoreClient(ctx);
  await client.request("/projects/p1/databases/(default)/documents/users", {
    query: { "mask.fieldPaths": ["a", "b"], pageSize: 10 },
  });
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    `${API_URL}/projects/p1/databases/(default)/documents/users`,
  );
  assertEquals(url.searchParams.getAll("mask.fieldPaths"), ["a", "b"]);
  assertEquals(url.searchParams.get("pageSize"), "10");

  await assertRejects(
    () => client.request("/projects/p1/databases/(default)/documents/users/alice"),
    Error,
    "NOT_FOUND",
  );
});

Deno.test("client: requestStream reads the streamed RPCs' JSON array, and tolerates one object", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: [{ document: { name: "x" } }, { readTime: "t" }] },
    { status: 200, body: { found: { name: "x" } } },
  ]);
  const client = new FirestoreClient(ctx);
  assertEquals((await client.requestStream("/x:runQuery", { method: "POST", body: {} })).length, 2);
  assertEquals((await client.requestStream("/y:batchGet", { method: "POST", body: {} })).length, 1);
});

Deno.test("client: an empty successful body is not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new FirestoreClient(ctx).request("/x"), undefined);
});
