import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Add new locales here (and a matching messages/<locale>.json) to enable them.
  locales: ["en"],
  defaultLocale: "en",
  // Default locale is served at "/", other locales get a prefix (e.g. "/de").
  localePrefix: "as-needed",
  // Keep "/" English regardless of Accept-Language until more locales exist.
  localeDetection: false,
});
