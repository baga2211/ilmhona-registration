import "./globals.css";

export const metadata = {
  title: "Ilmhona — Регистрация на курсы",
  description: "Опросник для регистрации студентов на курсы Ilmhona",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
