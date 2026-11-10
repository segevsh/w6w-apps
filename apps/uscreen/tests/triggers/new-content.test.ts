import trigger from "../../triggers/new-content.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite("new-content", trigger, "https://uscreen.io/publisher_api/v1/contents", "created_at", {
  dateField: false,
});
