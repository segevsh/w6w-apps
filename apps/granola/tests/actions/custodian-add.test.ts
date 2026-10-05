import { assert, assertEquals, assertRejects } from "@std/assert";
import custodianAdd from "../../actions/custodian-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custodian-add: posts the custodian objects", async () => {
  const body = { custodians: [{ id: "lhc_x" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await custodianAdd.execute(
    { holdId: "lgh_x", emails: ["a@x.com"], userIds: "usr_1,usr_2" },
    ctx,
  );
  assertEquals(out, body);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x/custodians");
  assertEquals(JSON.parse(calls[0].body!), {
    custodians: [{ email: "a@x.com" }, { id: "usr_1" }, { id: "usr_2" }],
  });
});

Deno.test("custodian-add: refuses an empty set without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await custodianAdd.execute({ holdId: "lgh_x" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("custodian-add: refuses more than 100 custodians", async () => {
  const { ctx, calls } = mockCtx([]);
  const emails = Array.from({ length: 101 }, (_, i) => "u" + i + "@x.com");
  await assertRejects(
    async () => await custodianAdd.execute({ holdId: "lgh_x", emails }, ctx),
    Error,
    "100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("custodian-add: 404 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "none" } }]);
  await assertRejects(
    async () => await custodianAdd.execute({ holdId: "lgh_x", emails: "a@x.com" }, ctx),
    Error,
    "404",
  );
  assert(custodianAdd.idempotent);
});
