import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, compact, csv, json, VercelClient } from "../../lib/client.ts";

const page = (key: string, items: unknown[], next: number | null) => ({
  [key]: items,
  pagination: { count: items.length, next, prev: null },
});

Deno.test("compact: drops unset keys but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: splits, trims and drops blanks; blank input stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(42), undefined);
});

Deno.test("json: parses a string param, passes a live value through, names a bad one", () => {
  assertEquals(json('{"a":1}', "meta"), { a: 1 });
  assertEquals(json({ a: 1 }, "meta"), { a: 1 });
  assertEquals(json("", "meta"), undefined);
  assertEquals(json(undefined, "meta"), undefined);
  const err = (() => {
    try {
      json("{oops", "gitSource");
    } catch (e) {
      return (e as Error).message;
    }
  })();
  assert(err!.includes("gitSource"), err);
});

Deno.test("client: no team scope means the personal account — no teamId on the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await VercelClient.fromConnection(ctx).request("/v2/user");
  assertEquals(calls[0].url, `${API_URL}/v2/user`);
});

Deno.test("client: the connection's teamId rides on every request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { teamId: "team_abc" },
  });
  await VercelClient.fromConnection(ctx).request("/v10/projects");
  assertEquals(new URL(calls[0].url).searchParams.get("teamId"), "team_abc");
});

Deno.test("client: an action's teamId overrides the connection's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { teamId: "team_abc", teamSlug: "acme" },
  });
  await VercelClient.fromConnection(ctx, "team_other").request("/v10/projects");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("teamId"), "team_other");
  // The override replaces the whole scope — a stale slug must not tag along.
  assertEquals(q.get("slug"), null);
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await VercelClient.fromConnection(ctx).request("/v2/user");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure surfaces the status and Vercel's own error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: "forbidden", message: "Not authorized" } },
  }], { display: {} });
  const err = await assertRejects(
    async () => await VercelClient.fromConnection(ctx).request("/v2/user"),
    Error,
  );
  assert(err.message.includes("403"), err.message);
  assert(err.message.includes("forbidden"), err.message);
});

Deno.test("client: 204 and an empty body both come back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }], { display: {} });
  const client = VercelClient.fromConnection(ctx);
  assertEquals(await client.request("/v9/projects/x", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/v2/user"), undefined);
});

Deno.test("client: requestAll follows pagination.next as the next page's `until`", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page("deployments", [{ uid: "1" }], 1540095775951) },
    { status: 200, body: page("deployments", [{ uid: "2" }], null) },
  ], { display: {} });

  const items = await VercelClient.fromConnection(ctx).requestAll("/v7/deployments", "deployments");
  assertEquals(items, [{ uid: "1" }, { uid: "2" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("until"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("until"), "1540095775951");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("client: a null `next` ends pagination — Vercel's last-page signal", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page("projects", [{ id: "1" }], null) },
  ], { display: {} });
  await VercelClient.fromConnection(ctx).requestAll("/v10/projects", "projects");
  assertEquals(calls.length, 1);
});

Deno.test("client: requestAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page("projects", [{ id: "1" }, { id: "2" }, { id: "3" }], 123) },
  ], { display: {} });
  const items = await VercelClient.fromConnection(ctx).requestAll(
    "/v10/projects",
    "projects",
    {},
    2,
  );
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 1);
});

Deno.test("client: array query values repeat the key, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await VercelClient.fromConnection(ctx).request("/v7/deployments", {
    query: { projectIds: ["a", "b"], target: "", state: "READY" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("projectIds"), ["a", "b"]);
  assertEquals(q.get("target"), null);
  assertEquals(q.get("state"), "READY");
});
