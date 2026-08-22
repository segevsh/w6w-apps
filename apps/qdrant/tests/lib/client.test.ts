import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DEFAULT_PORT,
  describeError,
  json,
  normalizeUrl,
  pointId,
  pointIds,
  QdrantClient,
  urlFromConnection,
} from "../../lib/client.ts";

const display = { url: "https://xyz.eu-central-1.aws.cloud.qdrant.io:6333" };
const ok = (result: unknown) => ({ status: 200, body: { time: 0.01, status: "ok", result } });

Deno.test("compact: drops unset keys so a default is not overwritten with nothing", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits, trims and drops empties", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text and names the bad field", () => {
  assertEquals(json('{"a":1}', "filter"), { a: 1 });
  try {
    json("{oops", "filter");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`filter`"), String(err));
  }
});

/**
 * Qdrant serves REST on 6333 and gRPC on 6334; a URL with no port goes to 443,
 * which on a self-hosted instance is usually nothing at all.
 */
Deno.test("normalizeUrl: fills in Qdrant's REST port when none was given", () => {
  assertEquals(normalizeUrl("qdrant.internal"), `https://qdrant.internal:${DEFAULT_PORT}`);
  assertEquals(normalizeUrl("http://localhost"), "http://localhost:6333");
});

Deno.test("normalizeUrl: keeps an explicit port and strips a path", () => {
  assertEquals(
    normalizeUrl("https://xyz.cloud.qdrant.io:6333/dashboard"),
    "https://xyz.cloud.qdrant.io:6333",
  );
  assertEquals(normalizeUrl("http://localhost:7000"), "http://localhost:7000");
});

Deno.test("normalizeUrl: refuses something that is not a URL", () => {
  for (const bad of ["", "not a url at all"]) {
    try {
      normalizeUrl(bad);
      throw new Error("expected a throw");
    } catch (err) {
      assert(/required|not a valid URL/.test(String(err)), String(err));
    }
  }
});

Deno.test("urlFromConnection: refuses with an actionable message when unset", () => {
  assertEquals(
    urlFromConnection({ display } as never),
    "https://xyz.eu-central-1.aws.cloud.qdrant.io:6333",
  );
  try {
    urlFromConnection({ display: {} } as never);
    throw new Error("expected a throw");
  } catch (err) {
    assert(/reconnect/.test(String(err)), String(err));
  }
});

/** Qdrant accepts a non-negative integer or a UUID, and nothing else. */
Deno.test("pointId: accepts integers and UUIDs", () => {
  assertEquals(pointId(42, "id"), 42);
  assertEquals(pointId("42", "id"), 42);
  assertEquals(
    pointId("550e8400-e29b-41d4-a716-446655440000", "id"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
});

Deno.test("pointId: refuses a natural key, and says what to do instead", () => {
  try {
    pointId("https://example.com/doc-1", "id");
    throw new Error("expected a throw");
  } catch (err) {
    assert(/hash it into a UUID/.test(String(err)), String(err));
  }
});

Deno.test("pointId: refuses a negative or fractional number", () => {
  for (const bad of [-1, 1.5]) {
    try {
      pointId(bad, "id");
      throw new Error("expected a throw");
    } catch (err) {
      assert(/non-negative integer/.test(String(err)), String(err));
    }
  }
});

Deno.test("pointIds: accepts a comma list and a JSON array", () => {
  assertEquals(pointIds("1, 2, 3", "ids"), [1, 2, 3]);
  assertEquals(pointIds("[4,5]", "ids"), [4, 5]);
  assertEquals(pointIds([6, "7"], "ids"), [6, 7]);
});

Deno.test("client: builds the URL from the connection and sets no api-key", async () => {
  const { ctx, calls } = mockCtx([ok({ collections: [] })], { display });
  await new QdrantClient(ctx).request("/collections");
  assertEquals(
    calls[0].url,
    "https://xyz.eu-central-1.aws.cloud.qdrant.io:6333/collections",
  );
  assertEquals(calls[0].headers["api-key"], undefined);
});

/** Qdrant wraps everything in {time, status, result}. */
Deno.test("client: unwraps the result envelope", async () => {
  const { ctx } = mockCtx([ok({ exists: true })], { display });
  assertEquals(await new QdrantClient(ctx).request("/collections/x/exists"), { exists: true });
});

Deno.test("client: query values reach the wire", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  await new QdrantClient(ctx).request("/collections/x/points", {
    method: "PUT",
    body: { points: [] },
    query: { wait: true },
  });
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
});

/**
 * A failure nests its message inside `status`, which on success is the string
 * "ok" — reading it without checking the type produces [object Object].
 */
Deno.test("describeError: reads the message nested inside status", () => {
  const out = describeError(
    404,
    JSON.stringify({ status: { error: "Collection `docs` doesn't exist!" }, time: 0 }),
  );
  assert(out.includes("Collection `docs` doesn't exist!"), out);
});

Deno.test("describeError: a 401 names read-only keys", () => {
  assert(/read-only key authenticates/.test(describeError(401, "{}")));
});

Deno.test("describeError: a 404 points at collection-exists", () => {
  assert(/collection-exists/.test(describeError(404, "{}")));
});

Deno.test("client: an error carries the method, the path and Qdrant's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: { error: "Not found: Collection `docs`" }, time: 0 },
  }], { display });
  await assertRejects(
    async () => await new QdrantClient(ctx).request("/collections/docs"),
    Error,
    "Qdrant 404 for GET /collections/docs: Not found: Collection `docs`",
  );
});
