export default function HeaderBar({
  email,
  onRefreshHref = "/dashboard",
}: {
  email: string;
  onRefreshHref?: string;
}) {
  return (
    <header style={{ marginBottom: 16 }}>
      <h1 style={{ margin: 0, fontSize: 56 }}>Dashboard</h1>
      <p style={{ marginTop: 8 }}>
        <b>User:</b> {email}
      </p>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        <a href={onRefreshHref}>Refrescar</a>
      </p>
    </header>
  );
}