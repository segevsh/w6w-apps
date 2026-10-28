import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-update.ts";

const display = { site: "acme" };
const current = {
  id: "1",
  title: "Old title",
  version: { number: 4 },
  body: { storage: { value: "<p>old</p>", representation: "storage" } },
};

Deno.test("page-update: reads the current version and increments it", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: current },
    { status: 200, body: { id: "1" } },
  ], { display });
  await action.execute!({ pageId: "1", title: "New title", body: "<p>new</p>" }, ctx);

  // The read comes first, and asks for the version explicitly.
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).searchParams.get("include-version"), "true");
  assertEquals(calls[1].method, "PUT");
  assertEquals(JSON.parse(calls[1].body!), {
    id: "1",
    status: "current",
    title: "New title",
    body: { representation: "storage", value: "<p>new</p>" },
    version: { number: 5 },
  });
});

Deno.test("page-update: an explicit version number skips the read entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], { display });
  await action.execute!({
    pageId: "1",
    title: "T",
    body: "<p>b</p>",
    versionNumber: 9,
    versionMessage: "bulk edit",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!).version, { number: 9, message: "bulk edit" });
});

/**
 * The endpoint is a full replace: omitting title or body would blank it. The
 * same read that resolves the version supplies whichever one was left out.
 */
Deno.test("page-update: an untouched title or body is carried over, not blanked", async () => {
  const titleOnly = mockCtx([
    { status: 200, body: current },
    { status: 200, body: {} },
  ], { display });
  await action.execute!({ pageId: "1", title: "New title" }, titleOnly.ctx);
  const sent = JSON.parse(titleOnly.calls[1].body!);
  assertEquals(sent.title, "New title");
  assertEquals(sent.body, { representation: "storage", value: "<p>old</p>" });

  const bodyOnly = mockCtx([
    { status: 200, body: current },
    { status: 200, body: {} },
  ], { display });
  await action.execute!({ pageId: "1", body: "<p>new</p>" }, bodyOnly.ctx);
  const sent2 = JSON.parse(bodyOnly.calls[1].body!);
  assertEquals(sent2.title, "Old title");
  assertEquals(sent2.body.value, "<p>new</p>");
});

Deno.test("page-update: a page with no readable version says so instead of guessing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "1", title: "T" } }], { display });
  await assertRejects(
    async () => await action.execute!({ pageId: "1" }, ctx),
    Error,
    "pass `versionNumber` explicitly",
  );
});

Deno.test("page-update: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
