import { GoogleFirebaseHostingCustomDomain } from "@cdktf/provider-google-beta/lib/google-firebase-hosting-custom-domain";
import { GoogleFirebaseHostingSite } from "@cdktf/provider-google-beta/lib/google-firebase-hosting-site";
import { GoogleFirebaseWebApp } from "@cdktf/provider-google-beta/lib/google-firebase-web-app";
import type { GoogleBetaProvider } from "@cdktf/provider-google-beta/lib/provider";
import { ProjectIamCustomRole } from "@cdktf/provider-google/lib/project-iam-custom-role";
import { ProjectIamMember } from "@cdktf/provider-google/lib/project-iam-member";
import { ServiceAccount } from "@cdktf/provider-google/lib/service-account";
import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";

export interface HostingConfig {
  project: string;
  domain: string;
  githubRepoIamMember: string;

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

    // For forwarding to cloud run.
    const runViewerRole = new ProjectIamCustomRole(this, "cloudrun-deployer", {
      roleId: "cloudRunServiceViewer",
      title: "Cloud Run Service Viewer",
      permissions: ["run.services.get"],
    });

    // Firebase does not support direct workload identity,
    // so we need to create a service account to deploy.
    const firebaseDeployer = new ServiceAccount(this, "firebase-deployer", {
      accountId: "firebase-deployer",
    });

    new ProjectIamMember(this, "firebase-deployer-hosting-admin", {
      project: config.project,
      role: "roles/firebasehosting.admin",
      member: firebaseDeployer.member,
    });

    new ProjectIamMember(this, "firebase-deployer-cloudrun-viewer", {
      project: config.project,
      role: runViewerRole.name,
      member: firebaseDeployer.member,
    });

    new ProjectIamMember(this, "github-firebase-deployer", {
      project: config.project,
      role: "roles/iam.serviceAccountTokenCreator",
      member: config.githubRepoIamMember,
    });
  }
}
