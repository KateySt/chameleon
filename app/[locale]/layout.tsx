import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { preload } from "react-dom";
import { MODEL_PATH } from "@/components/scene/modelPath";
import { routing } from "@/i18n/routing";
import "../globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  // Start fetching the model with the HTML instead of after the Scene chunk; crossOrigin must match GLTFLoader's fetch.
  preload(MODEL_PATH, { as: "fetch", crossOrigin: "anonymous" });

  return (
    <html
      lang={locale}
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
