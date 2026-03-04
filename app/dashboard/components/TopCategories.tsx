type TopCat = { id: string; name: string; total: number };

export default function TopCategories({ topCats }: { topCats: TopCat[] }) {
  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      <h3>Top categorías (gasto)</h3>
      <ul>
        {topCats.length ? (
          topCats.map((c) => (
            <li key={c.id}>
              {c.name}: {c.total}
            </li>
          ))
        ) : (
          <li>(sin datos aún)</li>
        )}
      </ul>
    </section>
  );
}