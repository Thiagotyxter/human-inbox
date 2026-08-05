import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tyxter Inbox",
  description: "Inbox enxuta para visualizar, assumir e devolver conversas da Tyxter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
