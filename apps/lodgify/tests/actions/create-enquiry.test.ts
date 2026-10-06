import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import createEnquiry from "../../actions/create-enquiry.ts";

Deno.test("create-enquiry: builds the body, adds the message as a Renter message, returns the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 77 }]);
  const out = await createEnquiry.execute({
    firstName: "Ada",
    email: "ada@example.com",
    propertyId: 5,
    arrival: "2026-09-01",
    adults: 2,
    message: "Is it pet friendly?",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/reservation/enquiry");
  assertEquals(JSON.parse(calls[0].body!), {
    arrival: "2026-09-01",
    guest_breakdown: { adults: 2 },
    property_id: 5,
    guest: { guest_name: { first_name: "Ada" }, email: "ada@example.com" },
    messages: [{ message: "Is it pet friendly?", type: "Renter" }],
  });
  assertEquals(out, { id: 77 });
});
