import type { GoogleFirebaseHostingCustomDomain } from "@cdktf/provider-google-beta/lib/google-firebase-hosting-custom-domain";
import { DataGoogleDnsRecordSet } from "@cdktf/provider-google/lib/data-google-dns-record-set";
import { DnsManagedZone } from "@cdktf/provider-google/lib/dns-managed-zone";
import { DnsRecordSet } from "@cdktf/provider-google/lib/dns-record-set";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Fn } from "cdktf";
import { Construct } from "constructs";

export interface DnsConfig {
  project: string;
  domain: string;
  devDomain?: string;
  devProject?: string;

  firebaseDomain: GoogleFirebaseHostingCustomDomain;
}

export class Dns extends Construct {
  constructor(scope: Construct, config: DnsConfig) {
    super(scope, "dns");

    const dnsService = new ProjectService(this, "service", {
      service: "dns.googleapis.com",
    });

    const zone = new DnsManagedZone(this, "zone", {
      name: Fn.replace(config.domain, ".", "-"),
      dnsName: `${config.domain}.`,
      dependsOn: [dnsService],
    });

    if (config.devDomain && config.devProject) {
      const delegateNameservers = new DataGoogleDnsRecordSet(
        this,
        "dev-delegate-ns",
        {
          project: config.devProject,
          managedZone: `${config.devDomain.replaceAll(".", "-")}`,
          name: `${config.devDomain}.`,
          type: "NS",
        },
      );

      new DnsRecordSet(this, "dev-ns", {
        managedZone: zone.name,
        name: `${config.devDomain}.`,
        type: "NS",
        ttl: 21600,
        rrdatas: delegateNameservers.rrdatas,
      });
    }

    // Can't automatically provision due to https://github.com/hashicorp/terraform-provider-google/issues/16873
    // We also can't use the same configuration for dev and prod since root URLs have different settings.
    // Because this is technically temporary, assuming that gets fixed, we hackily branch on the domain rather
    // than parameterizing.
    if (config.domain === "alpha.tasuke.dev") {
      // Need to get details from console since we use a subdomain zone, GCP rejects CNAME records, likely
      // incorrectly.
      new DnsRecordSet(this, "root-hosting-a", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });
      new DnsRecordSet(this, "root-hosting-txt", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "TXT",
        ttl: 300,
        rrdatas: ["hosting-site=tasuke-dev"],
      });
      new DnsRecordSet(this, "root-hosting-acme-txt", {
        managedZone: zone.name,
        name: `_acme-challenge.${zone.dnsName}`,
        type: "TXT",
        ttl: 300,
        rrdatas: ["BLsR9LtrhOq6Y5QMZ3wMHGIgazD6Zlv9HdieH4IkLPs"],
      });
    }

    if (config.domain === "tasuke.dev") {
      new DnsRecordSet(this, "root-hosting-a", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "A",
        ttl: 300,
        rrdatas: ["199.36.158.100"],
      });
      new DnsRecordSet(this, "root-hosting-txt", {
        managedZone: zone.name,
        name: zone.dnsName,
        type: "TXT",
        ttl: 300,
        rrdatas: ["hosting-site=tasuke-prod"],
      });
    }
  }
}
