import { assertEquals, assertThrows } from "@std/assert";
import {
  apiBase,
  compact,
  describeProblem,
  Document360Client,
  encodeId,
  readProblem,
  REGIONS,
  resolveRegion,
  toList,
} from "../../lib/client.ts";
import { CA, envelope, EU, mockCtx, PID, problem, PROBLEM_HEADERS, US } from "../_helpers.ts";

Deno.test("client: each region resolves to its documented host", () => {
  assertEquals(apiBase("eu"), EU);
  assertEquals(apiBase("us"), US);
  assertEquals(apiBase("ca"), CA);
  assertEquals(Object.keys(REGIONS), ["eu", "us", "ca"]);
});

Deno.test("client: region falls back to Europe for a missing or unknown value", () => {
  assertEquals(resolveRegion(undefined), "eu");
  // deno-lint-ignore no-explicit-any
  assertEquals(resolveRegion({ display: { region: "mars" } } as any), "eu");
  // deno-lint-ignore no-explicit-any
  assertEquals(resolveRegion({ display: { region: "us" } } as any), "us");
});

Deno.test("client: requests go to the Connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }], { region: "us", projectId: PID });
  const c = new Document360Client(ctx);
  await c.data("GET", c.projectPath(undefined));
  assertEquals(calls[0].url, `${US}/v3/projects/${PID}`);
});

Deno.test("client: no Connection projectId and no override is a clear error", () => {
  const { ctx } = mockCtx([], { region: "eu" });
  const c = new Document360Client(ctx);
  assertThrows(() => c.projectPath(undefined), Error, "no project id");
  assertEquals(c.projectPath("p 1", "/x"), "/v3/projects/p%201/x");
});

Deno.test("client: requests carry no credential and a JSON body gets a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const c = new Document360Client(ctx);
  await c.data("POST", "/v3/projects/x/articles", { body: { a: 1 } });
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: a 2xx envelope with success:false is an error", async () => {
  const { ctx } = mockCtx([{
    body: { success: false, errors: [{ code: "OPERATION_FAILED", message: "nope" }] },
  }]);
  const c = new Document360Client(ctx);
  let msg = "";
  try {
    await c.data("GET", "/v3/projects");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("nope"), true, msg);
});

Deno.test("client: a non-JSON 2xx body is reported, not parsed blindly", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const c = new Document360Client(ctx);
  let msg = "";
  try {
    await c.data("GET", "/v3/projects");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("non-JSON"), true, msg);
});

Deno.test("client: list returns items and the pagination block, and tolerates an empty body", async () => {
  const { ctx } = mockCtx([
    {
      body: { success: true, data: [{ id: 1 }], pagination: { has_more: true, next_cursor: "n" } },
    },
    { status: 200, body: "" },
  ]);
  const c = new Document360Client(ctx);
  const page = await c.list("/v3/projects");
  assertEquals(page.items, [{ id: 1 }]);
  assertEquals(page.pagination?.next_cursor, "n");
  assertEquals(await c.list("/v3/projects"), { items: [], pagination: null });
});

Deno.test("client: array query values repeat the key", () => {
  const { ctx } = mockCtx();
  const u = new URL(
    new Document360Client(ctx).url("/v3/x", { a: ["1", "2"], b: undefined, c: "" }),
  );
  assertEquals(u.searchParams.getAll("a"), ["1", "2"]);
  assertEquals(u.searchParams.has("b"), false);
  assertEquals(u.searchParams.has("c"), false);
});

Deno.test("client: describeProblem reads the code, field message, retry-after and trace id", async () => {
  const res = new Response(JSON.stringify(problem(429, "TOO_MANY_REQUESTS", "Slow down.")), {
    status: 429,
    headers: { ...PROBLEM_HEADERS, "retry-after": "42" },
  });
  const text = describeProblem(res, await readProblem(res));
  for (
    const part of ["HTTP 429", "TOO_MANY_REQUESTS", "Slow down.", "retry after 42s", "req_trace"]
  ) {
    assertEquals(text.includes(part), true, `${part} in ${text}`);
  }
});

Deno.test("client: an empty-body 401 is explained as a missing or invalid key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  let msg = "";
  try {
    await new Document360Client(ctx).data("GET", "/v3/projects");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401"), true, msg);
  assertEquals(msg.includes("missing or invalid API key"), true, msg);
});

Deno.test("client: helpers", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " "]), ["x"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});
