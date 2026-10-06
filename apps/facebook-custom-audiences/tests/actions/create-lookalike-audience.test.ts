import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-lookalike-audience.ts";

const form = (body: string | null) => new URLSearchParams(body ?? "");

Deno.test("create-lookalike-audience: POSTs subtype=LOOKALIKE with a lookalike_spec", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "901" } }]);
  await action.execute({
    adAccountId: "act_12",
    name: "LAL 1%",
    originAudienceId: "900",
    country: "us",
    type: "similarity",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/act_12/customaudiences");
  const f = form(calls[0].body);
  assertEquals(f.get("subtype"), "LOOKALIKE");
  assertEquals(f.get("origin_audience_id"), "900");
  assertEquals(JSON.parse(f.get("lookalike_spec")!), { country: "US", type: "similarity" });
});

Deno.test("create-lookalike-audience: ratio form with a starting ratio", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "902" } }]);
  await action.execute({
    adAccountId: "12",
    name: "LAL band",
    originAudienceId: "900",
    country: "GB",
    ratio: 0.05,
    startingRatio: 0.03,
    allowInternationalSeeds: true,
  }, ctx);
  assertEquals(JSON.parse(form(calls[0].body).get("lookalike_spec")!), {
    country: "GB",
    ratio: 0.05,
    starting_ratio: 0.03,
    allow_international_seeds: true,
  });
});

Deno.test("create-lookalike-audience: needs exactly one of type or ratio, and a sane band", async () => {
  const { ctx, calls } = mockCtx();
  const base = { adAccountId: "1", name: "n", originAudienceId: "2", country: "US" };
  await assertRejects(() => Promise.resolve(action.execute(base, ctx)), Error, "exactly one");
  await assertRejects(
    () => Promise.resolve(action.execute({ ...base, type: "reach", ratio: 0.1 }, ctx)),
    Error,
    "exactly one",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({ ...base, ratio: 0.02, startingRatio: 0.05 }, ctx)),
    Error,
    "Starting ratio",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({ ...base, country: "USA", type: "reach" }, ctx)),
    Error,
    "Country",
  );
  assertEquals(calls.length, 0);
});
