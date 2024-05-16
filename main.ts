import { App } from "cdktf";
import { TasukeStack } from "./stacks/tasuke";

const app = new App();

new TasukeStack(app, {
  environment: "dev",
  project: "tasuke-dev",
  domain: "alpha.tasuke.dev",
  githubClientId: "Ov23ctQGntk45hLDYp90",
  githubClientSecretCiphertext:
    "CiQAXEJPaOVToTI/ZP1UgABZxb46MbFaGbG9rudZQIYCj2dODLESUQC761MooR3tZ+oT2IYATtegCK1EEg2SRtTfJY1P6XjE/X/ZHlXJjT35/JcdJm7y23ro9jUCwAj941R1RDsXjxZNRrDBXaEhcgDYjR1MPcbV2w==",
});

new TasukeStack(app, {
  environment: "prod",
  project: "tasuke-prod",
  devProject: "tasuke-dev",
  domain: "tasuke.dev",
  devDomain: "alpha.tasuke.dev",
  githubClientId: "Ov23liuHVqDlwcWqecY6",
  githubClientSecretCiphertext:
    "CiQAZMaw+7BP/irMmJ8eSU2HOwjqq7FCFb2eBS7B1gxcYCpfrKQSUQAg6KTI4Fvw72Q+pfAjLR34Qzrd2ChGWiuargOzu1M2h0XnB7k+vsNt6OswVxgZcX26Z6xJkSCRsxXoX2fhD46V2//lQeb/xlbAGPHhtNse/w==",
});

app.synth();
