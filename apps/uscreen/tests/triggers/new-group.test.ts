import trigger from "../../triggers/new-group.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite("new-group", trigger, "https://uscreen.io/publisher_api/v1/groups");
