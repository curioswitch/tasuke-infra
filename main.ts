import { App } from "cdktf";
import { TasukeStack } from "./stacks/tasuke";

const app = new App();

new TasukeStack(app, {
  environment: "dev",
  project: "tasuke-dev",
  domain: "alpha.tasuke.dev",
});

new TasukeStack(app, {
  environment: "prod",
  project: "tasuke-prod",
  domain: "tasuke.dev",
});

app.synth();
