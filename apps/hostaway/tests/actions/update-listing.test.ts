import { assert, assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-listing.ts";

Deno.test("update-listing: PUTs a body of only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 40214, name: "Renamed" })]);
  await action.execute({ listingId: 40214, name: "Renamed", city: "Bremen" }, ctx);

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/listings/40214");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", city: "Bremen" });
});

Deno.test("update-listing: an explicit false/0 survives compaction", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({ listingId: 1, price: 0, minNights: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { price: 0, minNights: 0 });
});

Deno.test("update-listing: refuses an empty update instead of sending a bare PUT", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ listingId: 1 }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-listing: the documented cancellationPolicy values are the only selectable ones", () => {
  const policy = action.params?.find((p) => p.key === "cancellationPolicy");
  const values = (policy?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, ["", "flexible", "moderate", "firm", "strict", "no_refund"]);
  assert(policy?.hint?.includes("rejected"), "the hint must carry the docs' warning");
});
