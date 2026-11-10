import trigger from "../../triggers/new-contact.ts";
import { contactSuite } from "./_suite.ts";

contactSuite("new-contact", trigger, "created_at", (c) => c.id);
