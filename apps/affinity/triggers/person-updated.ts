import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "person-updated",
  title: "Person Updated",
  event: "person.updated",
  noun: "person",
  sampleBody: {
    "id": 38706,
    "first_name": "John",
    "last_name": "Doe",
    "primary_email": "john@example.test",
  },
});
