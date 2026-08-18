import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/place-photo.ts";

const NAME = "places/ChIJ1/photos/AeJbb3E";
const media = rpc({ name: NAME, photoUri: "https://lh3.googleusercontent.com/places/…" });

/**
 * Called plainly this endpoint 302s to the image bytes, which a JSON workflow
 * step cannot hold. `skipHttpRedirect` is what makes it answer with JSON.
 */
Deno.test("place-photo: always asks for JSON rather than the image bytes", async () => {
  const { ctx, calls } = mockCtx([media]);
  await action.execute!({ photoName: NAME, maxWidthPx: 400 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, `/v1/${NAME}/media`);
  assertEquals(url.searchParams.get("skipHttpRedirect"), "true");
  assertEquals(url.searchParams.get("maxWidthPx"), "400");
});

/** The URL expires; the name does not. */
Deno.test("place-photo: returns the durable name alongside the short-lived URL", async () => {
  const { ctx } = mockCtx([media]);
  const result = await action.execute!({ photoName: NAME, maxWidthPx: 800 }, ctx) as {
    name: string;
    photoUri: string;
  };
  assertEquals(result.name, NAME);
  assert(result.photoUri.startsWith("https://"), result.photoUri);
});

Deno.test("place-photo: sizes are clamped to Google's ceiling", async () => {
  const { ctx, calls } = mockCtx([media]);
  await action.execute!({ photoName: NAME, maxWidthPx: 99999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("maxWidthPx"), "4800");
});

Deno.test("place-photo: a height alone is enough", async () => {
  const { ctx, calls } = mockCtx([media]);
  await action.execute!({ photoName: NAME, maxWidthPx: 0, maxHeightPx: 300 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("maxHeightPx"), "300");
  assertEquals(url.searchParams.has("maxWidthPx"), false);
});

Deno.test("place-photo: no size at all is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ photoName: NAME, maxWidthPx: 0 }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

/** A place id is not a photo name, and the mistake is easy to make. */
Deno.test("place-photo: a place id in the photo slot is refused, with where to find the name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ photoName: "ChIJ1" }, ctx),
    Error,
    "places.photos[].name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("place-photo: needs a photo name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`photoName` is required");
});

Deno.test("place-photo: says the URL expires", () => {
  assert(/EXPIRES/.test(action.description!), action.description);
});
