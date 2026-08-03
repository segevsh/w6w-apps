import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createRecord from "../../actions/create-record.ts";

Deno.test("create-record: POSTs the doubly-nested { data: { values } } envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: { record_id: "r1" } } } }]);
  await createRecord.execute({
    object: "people",
    values: {
      name: { first_name: "John", last_name: "Smith", full_name: "John Smith" },
      email_addresses: ["john@smith.com"],
    },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/people/records");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      values: {
        name: { first_name: "John", last_name: "Smith", full_name: "John Smith" },
        email_addresses: ["john@smith.com"],
      },
    },
  });
});

Deno.test("create-record: rejects a values array before it reaches the wire", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      createRecord.execute({ object: "people", values: [{ name: "x" }] }, ctx) as Promise<
        unknown
      >,
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0, "a malformed payload must not be sent");
});

Deno.test("create-record: says it throws on conflict and points at Upsert", () => {
  const d = createRecord.description!;
  assert(/conflict/i.test(d), d);
  assert(d.includes("Upsert Record"), d);
  assertEquals(createRecord.idempotent, false);
});
