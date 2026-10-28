import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/place-get.ts";

const place = rpc({
  id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
  displayName: { text: "Google Sydney" },
  formattedAddress: "48 Pirrama Rd, Pyrmont NSW 2009",
});

Deno.test("place-get: accepts both the bare id and the resource name", async () => {
  const bare = mockCtx([place]);
  await action.execute!({ placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" }, bare.ctx);
  assertEquals(
    new URL(bare.calls[0].url).pathname,
    "/v1/places/ChIJN1t_tDeuEmsRUsoyG83frY4",
  );

  const full = mockCtx([place]);
  await action.execute!({ placeId: "places/ChIJN1t_tDeuEmsRUsoyG83frY4" }, full.ctx);
  assertEquals(new URL(full.calls[0].url).pathname, "/v1/places/ChIJN1t_tDeuEmsRUsoyG83frY4");
});

Deno.test("place-get: lifts the display name out of its wrapper", async () => {
  const { ctx } = mockCtx([place]);
  const result = await action.execute!({ placeId: "ChIJ1" }, ctx) as { displayName: string };
  assertEquals(result.displayName, "Google Sydney");
});

/**
 * A details response IS the place, so its mask takes no `places.` prefix. A
 * mask copied from a search action fails with a message about an unknown field.
 */
Deno.test("place-get: a search-shaped mask is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ placeId: "ChIJ1", fieldMask: "places.displayName" }, ctx),
    Error,
    "no `places.` prefix",
  );
  assertEquals(calls.length, 0);
});

Deno.test("place-get: the default mask is sent as a header", async () => {
  const { ctx, calls } = mockCtx([place]);
  await action.execute!({ placeId: "ChIJ1" }, ctx);
  assert(
    calls[0].headers["x-goog-fieldmask"].includes("displayName"),
    calls[0].headers["x-goog-fieldmask"],
  );
  assert(
    !calls[0].headers["x-goog-fieldmask"].includes("places."),
    calls[0].headers["x-goog-fieldmask"],
  );
});

Deno.test("place-get: reports the tier the mask bought", async () => {
  const { ctx, logs } = mockCtx([place]);
  const result = await action.execute!({
    placeId: "ChIJ1",
    fieldMask: "id,displayName,websiteUri",
  }, ctx) as { billingTier: string };
  assertEquals(result.billingTier, "Enterprise");
  assertEquals(logs[0].data, { billingTier: "Enterprise" });
});

/** The session token is what makes an autocomplete session bill as one unit. */
Deno.test("place-get: the session token closes an autocomplete session", async () => {
  const { ctx, calls } = mockCtx([place]);
  await action.execute!({ placeId: "ChIJ1", sessionToken: "sess-1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sessionToken"), "sess-1");
});

/** An id that stopped resolving means "re-find this place", not an outage. */
Deno.test("place-get: a 404 for a retired id surfaces as an error the caller can read", async () => {
  const { ctx } = mockCtx([rpc({ error: { code: 404, message: "Place not found." } }, 404)]);
  const error = await assertRejects(
    async () => await action.execute!({ placeId: "ChIJgone" }, ctx),
    Error,
  );
  assert(/Place not found/.test(error.message), error.message);
});

Deno.test("place-get: language and region are passed through", async () => {
  const { ctx, calls } = mockCtx([place]);
  await action.execute!({ placeId: "ChIJ1", languageCode: "fr", regionCode: "fr" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("languageCode"), "fr");
  assertEquals(url.searchParams.get("regionCode"), "fr");
});

Deno.test("place-get: needs a place id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`placeId` is required");
});
