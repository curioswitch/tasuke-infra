import { DataGoogleKmsSecret } from "@cdktf/provider-google/lib/data-google-kms-secret";
import { IdentityPlatformConfig } from "@cdktf/provider-google/lib/identity-platform-config";
import { IdentityPlatformDefaultSupportedIdpConfig } from "@cdktf/provider-google/lib/identity-platform-default-supported-idp-config";
import { ProjectService } from "@cdktf/provider-google/lib/project-service";
import { Construct } from "constructs";

export interface IdentityConfig {
  project: string;
  domain: string;
  githubClientId: string;
  githubClientSecretCiphertext: string;
}

export class Identity extends Construct {
  constructor(scope: Construct, config: IdentityConfig) {
    super(scope, "identity");

    const service = new ProjectService(this, "identitytoolkit", {
      service: "identitytoolkit.googleapis.com",
    });

    new IdentityPlatformConfig(this, "identity-platform", {
      signIn: {
        // Enable email mostly for integration tests that don't require GitHub access.
        // All real users will use GitHub auth.
        email: {
          enabled: true,
        },
      },
      authorizedDomains: [
        "localhost",
        config.domain,
        `${config.project}.web.app`,
        `${config.project}.firebaseapp.com`,
      ],
      dependsOn: [service],
    });

    const githubClientSecret = new DataGoogleKmsSecret(
      this,
      "github-client-secret",
      {
        cryptoKey: `${config.project}/global/terraform/secrets`,
        ciphertext: config.githubClientSecretCiphertext,
      },
    );

    new IdentityPlatformDefaultSupportedIdpConfig(this, "github-idp", {
      enabled: true,
      idpId: "github.com",
      clientId: config.githubClientId,
      clientSecret: githubClientSecret.plaintext,
    });
  }
}
