import { GoogleFirebaseWebApp } from "@cdktf/provider-google-beta/lib/google-firebase-web-app";
import type { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { Construct } from "constructs";

export interface HostingConfig {
  project: string;
  domain: string;

  googleBeta: GoogleBetaProvider;
}

export class Hosting extends Construct {
  constructor(scope: Construct, config: HostingConfig) {
    super(scope, "hosting");

    new GoogleFirebaseWebApp(this, "web-app", {
      project: config.project,
      displayName: "Tasuke",
      provider: config.googleBeta,
    });
  }
}
