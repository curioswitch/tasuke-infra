import { GoogleFirebaseHostingCustomDomain } from "@cdktf/provider-google-beta/lib/google-firebase-hosting-custom-domain";
import { GoogleFirebaseHostingSite } from "@cdktf/provider-google-beta/lib/google-firebase-hosting-site";
import { GoogleFirebaseWebApp } from "@cdktf/provider-google-beta/lib/google-firebase-web-app";
import type { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";

export interface HostingConfig {
  project: string;
  domain: string;

  googleBeta: GoogleBetaProvider;
}

export class Hosting extends Construct {
  public readonly customDomain: GoogleFirebaseHostingCustomDomain;

  constructor(scope: Construct, config: HostingConfig) {
    super(scope, "hosting");

    const webApp = new GoogleFirebaseWebApp(this, "web-app", {
      displayName: "Tasuke",
      provider: config.googleBeta,
    });

    const site = new GoogleFirebaseHostingSite(this, "hosting-site", {
      appId: webApp.appId,
      siteId: config.project,
      provider: config.googleBeta,
    });
    site.importFrom(config.project);

    this.customDomain = new GoogleFirebaseHostingCustomDomain(
      this,
      "custom-domain",
      {
        siteId: site.siteId,
        customDomain: config.domain,
        provider: config.googleBeta,
      },
    );

    new TerraformOutput(this, "custom-domain-dns-updates", {
      value: this.customDomain.requiredDnsUpdates,
    });
  }
}
