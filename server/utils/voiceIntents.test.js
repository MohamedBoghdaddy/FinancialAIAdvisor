import { FORBIDDEN_INTENTS, VOICE_INTENTS, getIntentConfig } from "./voiceIntents.js";

describe("voiceIntents", () => {
  test("forbidden intents include high-risk money/security actions", () => {
    expect(FORBIDDEN_INTENTS.has("transfer_funds")).toBe(true);
    expect(FORBIDDEN_INTENTS.has("change_password")).toBe(true);
    expect(FORBIDDEN_INTENTS.has("navigate_dashboard")).toBe(false);
  });

  test("getIntentConfig returns config for known low-risk intents", () => {
    const config = getIntentConfig("navigate_dashboard");
    expect(config).toEqual(VOICE_INTENTS.navigate_dashboard);
    expect(config.riskLevel).toBe("low");
    expect(config.route).toBe("/dashboard");
  });

  test("getIntentConfig returns undefined for unknown intents", () => {
    expect(getIntentConfig("not_a_real_intent")).toBeUndefined();
  });
});
