import trigger from "../../triggers/new-invoice.ts";
import { sinceSuite } from "./_suite.ts";

sinceSuite("new-invoice", trigger, "https://uscreen.io/publisher_api/v1/invoices");
