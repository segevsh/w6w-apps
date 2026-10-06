import action from "../../actions/get-domain-dns-records.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-domain-dns-records", action, "domainId", "/v1/domains/{id}/dns-records");
