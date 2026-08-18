import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/parcel-create.ts";

const created = { status: 200, body: { id: "prcl_1", weight: 16 } };

Deno.test("parcel-create: posts a wrapped parcel with its dimensions", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ weight: 16, length: 10, width: 8, height: 4 }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/parcels");
  assertEquals(JSON.parse(calls[0].body!), {
    parcel: { weight: 16, length: 10, width: 8, height: 4 },
  });
});

/** Carrier packaging has fixed dimensions and its own pricing. */
Deno.test("parcel-create: a predefined package replaces the dimensions", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ weight: 16, predefinedPackage: "FlatRateEnvelope" }, ctx);
  const parcel = JSON.parse(calls[0].body!).parcel;
  assertEquals(parcel.predefined_package, "FlatRateEnvelope");
  assertEquals(parcel.length, undefined);
});

Deno.test("parcel-create: a zero or missing weight is refused", async () => {
  for (const weight of [0, -1, undefined]) {
    const { ctx, calls } = mockCtx();
    await assertRejects(
      async () => await action.execute!({ weight, length: 1, width: 1, height: 1 }, ctx),
      Error,
      "ounces",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("parcel-create: missing dimensions without a predefined package are refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ weight: 16 }, ctx),
    Error,
    "predefinedPackage",
  );
  assertEquals(calls.length, 0);
});

/** Nothing validates the units, and the carrier rebills the real weight. */
Deno.test("parcel-create: puts the units in the description and the hint", () => {
  assert(/OUNCES/.test(action.description!), action.description);
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "weight"
  )!;
  assert(/35\.27 oz/.test(p.hint!), p.hint);
});
