import trigger from "../../triggers/new-customer.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite("new-customer", trigger, "https://uscreen.io/publisher_api/v1/customers");
