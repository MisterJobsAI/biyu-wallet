type Account = { id: string; name: string; balance: number; currency: string };

export default function BalanceCard({ accounts }: { accounts: Account[] }) {
  return (
    <section style={{ marginTop: 16, marginBottom: 16 }}>
      <h2>Balances</h2>
      <ul>
        {accounts.map((a) => (
          <li key={a.id}>
            {a.name} — {a.balance} {a.currency}
          </li>
        ))}
      </ul>
    </section>
  );
}