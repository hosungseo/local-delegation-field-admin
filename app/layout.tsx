import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "현장집행·감독관리 사무 166건 탐색기",
  description: "법률상 지자체 수임 가능 유형과 시행령 현재 수임자를 교차 분석한 정적 탐색기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
