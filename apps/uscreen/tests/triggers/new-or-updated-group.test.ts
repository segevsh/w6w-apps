import trigger from "../../triggers/new-or-updated-group.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite(
  "new-or-updated-group",
  trigger,
  "https://uscreen.io/publisher_api/v1/groups",
  "updated_at",
);
