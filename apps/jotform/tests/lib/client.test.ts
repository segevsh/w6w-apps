import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import {
  API_HOSTS,
  hostForRegion,
  hostFromConnection,
  JotformClient,
  serializeFilter,
  submissionFields,
} from "../../lib/client.ts";

Deno.test("client: defaults to the US host when the connection records nothing", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new JotformClient(ctx).request("/user");
  assertEquals(new URL(calls[0].url).host, API_HOSTS.us);
});

Deno.test("client: uses the connection's apiHost for EU and HIPAA accounts", async () => {
  for (const host of [API_HOSTS.eu, API_HOSTS.hipaa]) {
    const { ctx, calls } = mockCtx([{ body: envelope({}) }], { display: { apiHost: host } });
    await new JotformClient(ctx).request("/user");
    assertEquals(new URL(calls[0].url).host, host);
  }
});

Deno.test("client: falls back to the region key when apiHost is absent or unknown", () => {
  assertEquals(
    hostFromConnection({ display: { region: "eu" } } as never),
    API_HOSTS.eu,
  );
  // An unrecognised host is not trusted onto the wire — the region decides.
  assertEquals(
    hostFromConnection({ display: { apiHost: "evil.example.com", region: "hipaa" } } as never),
    API_HOSTS.hipaa,
  );
  assertEquals(hostFromConnection(undefined), API_HOSTS.us);
});

Deno.test("hostForRegion: maps every documented region, unknown falls back to US", () => {
  assertEquals(hostForRegion("us"), API_HOSTS.us);
  assertEquals(hostForRegion("eu"), API_HOSTS.eu);
  assertEquals(hostForRegion("hipaa"), API_HOSTS.hipaa);
  assertEquals(hostForRegion(undefined), API_HOSTS.us);
  assertEquals(hostForRegion("mars"), API_HOSTS.us);
});

Deno.test("client: unwraps the envelope and normalises limit-left", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope([{ id: "1" }], {
        resultSet: { offset: 0, limit: 20, count: 1 },
        "limit-left": 4986,
      }),
    },
  ]);
  const env = await new JotformClient(ctx).request<unknown[]>("/user/forms");
  assertEquals(env.content, [{ id: "1" }]);
  assertEquals(env.resultSet, { offset: 0, limit: 20, count: 1 });
  assertEquals(env.limitLeft, 4986);
  assertEquals(env.responseCode, 200);
});

Deno.test("client: content() returns just the payload", async () => {
  const { ctx } = mockCtx([{ body: envelope({ username: "johnsmith" }) }]);
  assertEquals(await new JotformClient(ctx).content("/user"), { username: "johnsmith" });
});

Deno.test("client: throws with Jotform's own message on an HTTP error", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { responseCode: 401, message: "You're not authorized to use (/user) ", content: "" },
    },
  ]);
  const err = await assertRejects(
    () => new JotformClient(ctx).request("/user"),
    Error,
    "Jotform 401",
  );
  assertEquals(err.message.includes("You're not authorized"), true);
  assertEquals(err.message.includes("/user"), true);
});

Deno.test("client: throws on a non-2xx responseCode even when the transport says 200", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { responseCode: 404, message: "Form not found", content: "" } },
  ]);
  await assertRejects(
    () => new JotformClient(ctx).request("/form/nope"),
    Error,
    "Jotform 404",
  );
});

Deno.test("client: a non-JSON error body still produces a descriptive error", async () => {
  const { ctx } = mockCtx([
    { status: 502, statusText: "Bad Gateway", body: "<html>gateway</html>", headers: {} },
  ]);
  await assertRejects(() => new JotformClient(ctx).request("/user"), Error, "Jotform 502");
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new JotformClient(ctx).request("/user/forms", {
    query: { a: "kept", b: undefined, c: null, d: "", e: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
  assertEquals(url.searchParams.get("e"), "0");
});

Deno.test("client: form bodies are x-www-form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ submissionID: "1" }) }]);
  await new JotformClient(ctx).request("/form/9/submissions", {
    method: "POST",
    form: { "submission[1]": "hello there" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    new URLSearchParams(calls[0].body!).get("submission[1]"),
    "hello there",
  );
});

Deno.test("client: never sets an auth header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new JotformClient(ctx).request("/user");
  assertEquals(calls[0].headers["apikey"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("serializeFilter: objects are JSON-encoded, strings pass through, blanks drop", () => {
  assertEquals(
    serializeFilter({ "created_at:gt": "2013-01-01 00:00:00" }),
    '{"created_at:gt":"2013-01-01 00:00:00"}',
  );
  assertEquals(serializeFilter('{"new":"1"}'), '{"new":"1"}');
  assertEquals(serializeFilter(undefined), undefined);
  assertEquals(serializeFilter(""), undefined);
});

Deno.test("submissionFields: flattens scalars into submission[key]", () => {
  assertEquals(
    submissionFields({ "1": "Hello", "2_first": "John", "3": 42, "4": false }),
    {
      "submission[1]": "Hello",
      "submission[2_first]": "John",
      "submission[3]": "42",
      "submission[4]": "false",
    },
  );
});

Deno.test("submissionFields: arrays become indexed entries; null/undefined are dropped", () => {
  assertEquals(
    submissionFields({ "5": ["a", "b"], "6": null, "7": undefined }),
    { "submission[5][0]": "a", "submission[5][1]": "b" },
  );
});

Deno.test("submissionFields: a nested object is rejected rather than guessed at", () => {
  assertThrows(
    () => submissionFields({ "2": { first: "John" } }),
    Error,
    "nested object",
  );
});
