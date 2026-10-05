import type { routing } from "./i18n/routing";
import type messages from "./messages/en.json";

// Type-safe locales and message keys: a typo in t("...") becomes a TS error.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
