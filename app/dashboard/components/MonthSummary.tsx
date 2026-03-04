export default function MonthSummary({
  income,
  expense,
  net,
}: {
  income: number;
  expense: number;
  net: number;
}) {
  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      <h2>Este mes</h2>
      <p>
        <b>Ingresos:</b> {income}
      </p>
      <p>
        <b>Gastos:</b> {expense}
      </p>
      <p>
        <b>Neto:</b> {net}
      </p>
    </section>
  );
}