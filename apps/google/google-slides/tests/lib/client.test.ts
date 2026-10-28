import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  batchUpdate,
  buildElementProperties,
  buildMatchCriteria,
  buildWriteControl,
  extractPresentationId,
  GoogleSlidesClient,
  singleRequestBody,
  SLIDES_API,
} from "../../lib/client.ts";

Deno.test("client: resolves relative paths against slides.googleapis.com/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1" } }]);
  await new GoogleSlidesClient(ctx).request("/presentations/p1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://slides.googleapis.com");
  assertEquals(url.pathname, "/v1/presentations/p1");
  assertEquals(SLIDES_API, "https://slides.googleapis.com/v1");
});

Deno.test("client: passes absolute URLs through untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleSlidesClient(ctx).request("https://slides.googleapis.com/v1/presentations/x");
  assertEquals(calls[0].url, "https://slides.googleapis.com/v1/presentations/x");
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleSlidesClient(ctx).request("/presentations/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleSlidesClient(ctx).request("/presentations", {
    method: "POST",
    body: { title: "Deck" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "Deck" });
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  assertEquals(await new GoogleSlidesClient(ctx).request("/presentations/x"), undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 401, statusText: "Unauthorized", body: '{"error":{"status":"UNAUTHENTICATED"}}' },
  ]);
  const err = await assertRejects(
    () => new GoogleSlidesClient(ctx).request("/presentations/p1"),
    Error,
    "Google Slides 401",
  );
  assertEquals(err.message.includes("/v1/presentations/p1"), true);
  // The error quotes Google's envelope but never a credential — nothing in the
  // client ever sees one.
  assertEquals(/Bearer|access_token|private/i.test(err.message), false);
});

Deno.test("extractPresentationId: unwraps an editor URL", () => {
  assertEquals(
    extractPresentationId("https://docs.google.com/presentation/d/abc-123_XYZ/edit#slide=id.p"),
    "abc-123_XYZ",
  );
});

Deno.test("extractPresentationId: passes a raw ID through", () => {
  assertEquals(extractPresentationId("abc-123_XYZ"), "abc-123_XYZ");
});

Deno.test("extractPresentationId: refuses to unwrap the published /d/e/ identifier", () => {
  const published = "https://docs.google.com/presentation/d/e/2PACX-xyz/pub";
  assertEquals(extractPresentationId(published), published);
});

Deno.test("buildWriteControl: only requiredRevisionId exists on Slides", () => {
  assertEquals(buildWriteControl("r1"), { requiredRevisionId: "r1" });
  assertEquals(buildWriteControl(undefined), undefined);
  assertEquals(buildWriteControl(""), undefined);
});

Deno.test("singleRequestBody: omits writeControl entirely when no revision given", () => {
  assertEquals(singleRequestBody({ deleteObject: { objectId: "x" } }), {
    requests: [{ deleteObject: { objectId: "x" } }],
  });
});

Deno.test("singleRequestBody: attaches writeControl when a revision is given", () => {
  assertEquals(
    singleRequestBody({ deleteObject: { objectId: "x" } }, { requiredRevisionId: "r9" }),
    {
      requests: [{ deleteObject: { objectId: "x" } }],
      writeControl: { requiredRevisionId: "r9" },
    },
  );
});

Deno.test("batchUpdate: POSTs to the :batchUpdate path with the ID unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1", replies: [{}] } }]);
  await batchUpdate(ctx, "https://docs.google.com/presentation/d/p1/edit", {
    requests: [{ createSlide: {} }],
  });
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), { requests: [{ createSlide: {} }] });
});

Deno.test("buildElementProperties: bare page id emits neither size nor transform", () => {
  assertEquals(buildElementProperties({ pageObjectId: "s1" }), { pageObjectId: "s1" });
});

Deno.test("buildElementProperties: folds size into Dimension objects with the chosen unit", () => {
  assertEquals(
    buildElementProperties({ pageObjectId: "s1", width: 350, height: 100, unit: "PT" }),
    {
      pageObjectId: "s1",
      size: {
        width: { magnitude: 350, unit: "PT" },
        height: { magnitude: 100, unit: "PT" },
      },
    },
  );
});

Deno.test("buildElementProperties: a translation defaults both scales to 1", () => {
  assertEquals(
    buildElementProperties({ pageObjectId: "s1", translateX: 10, translateY: 20 }),
    {
      pageObjectId: "s1",
      transform: { scaleX: 1, scaleY: 1, translateX: 10, translateY: 20, unit: "EMU" },
    },
  );
});

Deno.test("buildElementProperties: explicit scales survive, translations default to 0", () => {
  assertEquals(
    buildElementProperties({ pageObjectId: "s1", scaleX: 2, scaleY: 3, unit: "PT" }),
    {
      pageObjectId: "s1",
      transform: { scaleX: 2, scaleY: 3, translateX: 0, translateY: 0, unit: "PT" },
    },
  );
});

Deno.test("buildMatchCriteria: matchCase defaults to false, searchByRegex is omitted", () => {
  assertEquals(buildMatchCriteria("find"), { text: "find", matchCase: false });
  assertEquals(buildMatchCriteria("find", true, true), {
    text: "find",
    matchCase: true,
    searchByRegex: true,
  });
});
