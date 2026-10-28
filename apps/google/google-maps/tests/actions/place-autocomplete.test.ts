import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/place-autocomplete.ts";

const mixed = rpc({
  suggestions: [
    { placePrediction: { placeId: "a", text: { text: "Pizza Express, Soho" } } },
    { queryPrediction: { text: { text: "pizza near me" } } },
    { placePrediction: { placeId: "b", text: { text: "Pizza Pilgrims" } } },
  ],
});

/**
 * Two kinds live in one array. A caller reading `suggestions[0].placePrediction`
 * gets undefined for the query kind.
 */
Deno.test("place-autocomplete: splits place predictions from query predictions", async () => {
  const { ctx } = mockCtx([mixed]);
  const result = await action.execute!({ input: "piz", sessionToken: "s1" }, ctx) as {
    count: number;
    predictions: unknown[];
    queryPredictions: unknown[];
  };
  assertEquals(result.count, 2);
  assertEquals(result.predictions.length, 2);
  assertEquals(result.queryPredictions.length, 1);
});

/** Without a shared token every keystroke is a separately-billed request. */
Deno.test("place-autocomplete: the session token is sent, and returned for the closing call", async () => {
  const { ctx, calls } = mockCtx([mixed]);
  const result = await action.execute!({ input: "piz", sessionToken: "s1" }, ctx) as {
    sessionToken: string;
  };
  assertEquals(JSON.parse(calls[0].body!).sessionToken, "s1");
  assertEquals(result.sessionToken, "s1");
});

Deno.test("place-autocomplete: omitting the token warns, because it costs real money", async () => {
  const { ctx, logs } = mockCtx([mixed]);
  await action.execute!({ input: "piz" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/billed on its own/.test(logs[0].message), logs[0].message);
});

/**
 * Deliberately not invented here: a token this action made up would be
 * discarded before the next keystroke and would achieve nothing.
 */
Deno.test("place-autocomplete: does not invent a session token", async () => {
  const { ctx, calls } = mockCtx([mixed]);
  const result = await action.execute!({ input: "piz" }, ctx) as { sessionToken?: string };
  assertEquals(JSON.parse(calls[0].body!).sessionToken, undefined);
  assertEquals(result.sessionToken, undefined);
});

Deno.test("place-autocomplete: a bias becomes a circle", async () => {
  const { ctx, calls } = mockCtx([mixed]);
  await action.execute!({ input: "piz", locationBias: "51.5,-0.12", biasRadius: 3000 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).locationBias, {
    circle: { center: { latitude: 51.5, longitude: -0.12 }, radius: 3000 },
  });
});

Deno.test("place-autocomplete: type and country lists are split", async () => {
  const { ctx, calls } = mockCtx([mixed]);
  await action.execute!({
    input: "piz",
    includedPrimaryTypes: "restaurant, cafe",
    includedRegionCodes: "gb,ie",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includedPrimaryTypes, ["restaurant", "cafe"]);
  assertEquals(body.includedRegionCodes, ["gb", "ie"]);
});

Deno.test("place-autocomplete: query predictions are opt-in", async () => {
  const off = mockCtx([mixed]);
  await action.execute!({ input: "piz" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).includeQueryPredictions, undefined);

  const on = mockCtx([mixed]);
  await action.execute!({ input: "piz", includeQueryPredictions: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).includeQueryPredictions, true);
});

Deno.test("place-autocomplete: needs an input", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`input` is required");
  assertEquals(calls.length, 0);
});
