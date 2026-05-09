import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "법률-시행령 형식 기준 804건 F분류 탐색기",
  description: "사무 성격 판단을 제외하고 법률상 지자체 형식과 시행령 수임자 형식만으로 재분류한 F분류 탐색기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
