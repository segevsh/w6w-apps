import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "person-created",
  title: "Person Created",
  event: "person.created",
  noun: "person",
  sampleBody: {
    "id": 38706,
    "first_name": "John",
    "last_name": "Doe",
    "primary_email": "john@example.test",
  },
});
