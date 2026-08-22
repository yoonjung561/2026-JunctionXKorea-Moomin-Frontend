import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoomIn",
  description: "MoomIn 상담 기록 문서 분석",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
