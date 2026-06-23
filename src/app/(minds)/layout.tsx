import MindsLayoutClient from "./MindsLayoutClient";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MindsLayoutClient>{children}</MindsLayoutClient>;
}
