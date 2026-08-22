import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/offer-get.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("offer-get: fetches one offer with its terms by default", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "o1", acceptanceStatus: "Accepted" })]);
  const result = await action.execute!({ offerId: "o1" }, ctx) as { acceptanceStatus: string };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/offer.info");
  assertEquals(JSON.parse(calls[0].body!), { offerId: "o1" });
  assertEquals(result.acceptanceStatus, "Accepted");
});

/**
 * There is no reason to carry somebody's salary through steps that do not read
 * it, so excluding the terms is a first-class option.
 */
Deno.test("offer-get: can leave the compensation out entirely", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "o1" })]);
  await action.execute!({ offerId: "o1", excludeFormDefinition: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).excludeFormDefinition, true);

  const p = (action.params as Array<{ key: string; advanced?: boolean }>)
    .find((p) => p.key === "excludeFormDefinition")!;
  assertEquals(p.advanced, undefined);
});

Deno.test("offer-get: needs an offer id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "offerId");
  assertEquals(calls.length, 0);
});

/** Nothing from the response reaches a log. */
Deno.test("offer-get: logs nothing at all", async () => {
  const { ctx, logs } = mockCtx([ok({ id: "o1", latestVersion: { salary: 120000 } })]);
  await action.execute!({ offerId: "o1" }, ctx);
  assertEquals(logs.length, 0);
});
