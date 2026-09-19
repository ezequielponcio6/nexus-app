import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/primitives";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const TX_LABELS: Record<string, string> = {
  credit_purchase: "Compra de coins",
  tip_sent: "Coins enviados",
  tip_received: "Coins recebidos",
  creator_payout: "Repasse de criador",
  refund: "Reembolso",
  subscription_reward: "Recompensa de assinatura",
};

export default async function CarteiraPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/carteira");

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase
      .from("wallet_transactions")
      .select("id, amount, type, created_at, counterparty:profiles!wallet_transactions_counterparty_id_fkey(display_name)")
      .eq("wallet_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <AppShell activePath="/carteira">
      <h1 className="font-display italic text-xl font-medium mb-5">Carteira</h1>

      <Card className="p-6 mb-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Saldo disponível</div>
        <div className="font-display text-4xl mt-2 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-signal inline-block" />
          {(wallet?.balance ?? 0).toLocaleString("pt-BR")}
          <span className="text-base text-muted-foreground font-sans font-normal ml-1">coins</span>
        </div>
      </Card>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Extrato
      </h2>

      <Card className="divide-y divide-border">
        {(!transactions || transactions.length === 0) && (
          <p className="p-5 text-sm text-muted-foreground text-center">Nenhuma movimentação ainda.</p>
        )}
        {transactions?.map((tx: any) => {
          const isCredit = tx.amount > 0;
          return (
            <div key={tx.id} className="flex items-center gap-3 p-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ${
                  isCredit ? "bg-live/15 text-live" : "bg-destructive/10 text-destructive"
                }`}
              >
                {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{TX_LABELS[tx.type] ?? tx.type}</div>
                <div className="text-xs text-muted-foreground">
                  {tx.counterparty?.display_name && `com ${tx.counterparty.display_name} · `}
                  {formatDistanceToNowStrict(new Date(tx.created_at), { locale: ptBR })} atrás
                </div>
              </div>
              <div className={`text-sm font-semibold ${isCredit ? "text-live" : "text-foreground"}`}>
                {isCredit ? "+" : ""}
                {tx.amount.toLocaleString("pt-BR")}
              </div>
            </div>
          );
        })}
      </Card>
    </AppShell>
  );
}
