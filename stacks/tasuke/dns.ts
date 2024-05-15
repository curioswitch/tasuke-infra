import { DnsManagedZone } from "@cdktf/provider-google/lib/dns-managed-zone";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Fn } from "cdktf";
import { Construct } from "constructs";

export interface DnsConfig {
  domain: string;
}

export class Dns extends Construct {
  constructor(scope: Construct, config: DnsConfig) {
    super(scope, "dns");

    const dnsService = new ProjectService(this, "service", {
      service: "dns.googleapis.com",
    });

    new DnsManagedZone(this, "zone", {
      name: Fn.replace(config.domain, ".", "-"),
      dnsName: `${config.domain}.`,
      dependsOn: [dnsService],
    });
  }
}
