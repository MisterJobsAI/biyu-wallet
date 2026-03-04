type Entry = {
  amount: number;
  kind: string;
  asset: string;
  description: string | null;
  occurred_at: string;
};

export default function LastMovements({ entries }: { entries: Entry[] }) {
  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      <h2>Últimos movimientos</h2>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>
            {new Date(e.occurred_at).toLocaleString()} — {e.kind} {e.amount}{" "}
            {e.asset}
            {e.description ? ` — ${e.description}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}