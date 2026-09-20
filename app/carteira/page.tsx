"use client";

import { useState, useEffect, Suspense } from "react";
import { Wallet, Coins, Award, Palette, ShoppingBag, Check, Flame, ShieldCheck, Sparkles, Gem, Copy, QrCode, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

function CarteiraContent() {
  const [coins, setCoins] = useState(10); // Começa com menos moedas para valorizar
  const [dailyClaimed, setDailyClaimed] = useState(false);
  
  // Sistema de Ofensiva (Dias seguidos)
  const [streak, setStreak] = useState(1); 
  
  const [purchasedColors, setPurchasedColors] = useState<string[]>(["text-foreground"]);
  const [activeColor, setActiveColor] = useState("text-foreground");
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [activeVipPlan, setActiveVipPlan] = useState<string | null>(null);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [cashoutReceipt, setCashoutReceipt] = useState<{
    grossCoins: number;
    platformFee: number;
    netCoins: number;
    netReais: number;
    pixKey: string;
  } | null>(null);
  const [checkoutPackage, setCheckoutPackage] = useState<{ id: string; name: string; coins: number; price: string } | null>(null);
  const [pixCode, setPixCode] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    const savedCoins = localStorage.getItem("nexus_coins");
    const savedDaily = localStorage.getItem("nexus_daily_claimed");
    const savedStreak = localStorage.getItem("nexus_streak");
    const savedPurchased = localStorage.getItem("nexus_purchased_colors");
    const savedActiveColor = localStorage.getItem("nexus_name_color");
    const savedVipPlan = localStorage.getItem("nexus_vip_plan");

    if (savedCoins) setCoins(Number(savedCoins));
    if (savedDaily) setDailyClaimed(savedDaily === "true");
    if (savedStreak) setStreak(Number(savedStreak));
    if (savedPurchased) setPurchasedColors(JSON.parse(savedPurchased));
    if (savedActiveColor) setActiveColor(savedActiveColor);
    if (savedVipPlan) setActiveVipPlan(savedVipPlan);
  }, []);

  // VALORES RECALIBRADOS: Itens raros que exigem esforço real de dias jogando
  const lojaCores = [
    { id: "text-purple-500", name: "Roxo Neon (Comum)", preco: 150, classe: "text-purple-500" },
    { id: "text-emerald-500", name: "Verde Cyberpunk (Raro)", preco: 350, classe: "text-emerald-500" },
    { id: "text-rose-500", name: "Rosa Creator (Épico)", preco: 600, classe: "text-rose-500" },
    { id: "text-amber-500", name: "Dourado Eterno (Lendário)", preco: 1200, classe: "text-amber-500" },
  ];

  const moedasPackages = [
    {
      id: "saco-coins",
      name: "Saco de Coins",
      coins: 200,
      price: "R$ 4,90",
      highlight: false,
      accent: "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700",
      badge: "Básico",
    },
    {
      id: "cofre-minerador",
      name: "Cofre do Minerador",
      coins: 600,
      price: "R$ 12,90",
      highlight: true,
      accent: "from-amber-200 via-yellow-300 to-amber-500",
      badge: "Mais Vendido",
    },
    {
      id: "fortuna-lendaria",
      name: "Fortuna Lendária",
      coins: 1500,
      price: "R$ 29,90",
      highlight: false,
      accent: "from-violet-200 via-fuchsia-300 to-purple-500",
      badge: "Elite",
    },
  ];

  const vipPlans = [
    {
      id: "bronze-creator",
      name: "Plano Bronze Creator",
      price: 200,
      benefit: "Distintivo Bronze exclusivo",
      accent: "border-orange-700/40 bg-gradient-to-br from-orange-950/20 to-background",
      badge: "Bronze",
    },
    {
      id: "prata-influencer",
      name: "Plano Prata Influencer",
      price: 500,
      benefit: "Distintivo Prata + Destaque",
      accent: "border-slate-400/50 bg-gradient-to-br from-slate-500/10 to-background",
      badge: "Prata",
    },
    {
      id: "ouro-vip",
      name: "Plano Ouro VIP",
      price: 1000,
      benefit: "Medalha Ouro Lendária + Recursos de Elite",
      accent: "border-amber-400 bg-gradient-to-br from-amber-500/20 via-yellow-500/5 to-background shadow-[0_14px_40px_rgba(251,191,36,0.18)]",
      badge: "Ouro VIP",
    },
  ];

  // Cálculo de ganho baseado no dia atual da ofensiva
  const ganhoHoje = 10 + (streak * 5); // Dia 1 ganha 15, Dia 2 ganha 20, etc.
  const proximoBonusEmDias = 7 - (streak % 7);

  const handleClaimDaily = () => {
    if (dailyClaimed) return;
    
    let bonusFinal = ganhoHoje;
    let novaOfensiva = streak + 1;
    let mensagemAlert = `Você coletou a recompensa do Dia ${streak}! +${ganhoHoje} NX\$ adicionados. ⚡`;

    // Bônus do 7º Dia (O grande prêmio de retenção)
    if (novaOfensiva % 7 === 0) {
      bonusFinal += 100;
      mensagemAlert = `🔥 INCRÍVEL! Você completou uma ofensiva de 7 dias! Você ganhou o bônus máximo de +100 NX\$ e coletou um total de ${ganhoHoje + 100} NX\$!`;
    }

    const novoSaldo = coins + bonusFinal;
    
    setCoins(novoSaldo);
    setDailyClaimed(true);
    setStreak(novaOfensiva);

    localStorage.setItem("nexus_coins", novoSaldo.toString());
    localStorage.setItem("nexus_daily_claimed", "true");
    localStorage.setItem("nexus_streak", novaOfensiva.toString());
    
    alert(mensagemAlert);
  };

  const handleBuyColor = (colorId: string, preco: number) => {
    if (purchasedColors.includes(colorId)) {
      setActiveColor(colorId);
      localStorage.setItem("nexus_name_color", colorId);
      return;
    }

    if (coins < preco) {
      alert(`Saldo insuficiente! Este item custa ${preco} NX\$. Continue sua ofensiva diária para acumular moedas.`);
      return;
    }

    const novoSaldo = coins - preco;
    const novasCores = [...purchasedColors, colorId];
    
    setCoins(novoSaldo);
    setPurchasedColors(novasCores);
    setActiveColor(colorId);

    localStorage.setItem("nexus_coins", novoSaldo.toString());
    localStorage.setItem("nexus_purchased_colors", JSON.stringify(novasCores));
    localStorage.setItem("nexus_name_color", colorId);
    alert("Upgrade de perfil comprado e equipado com sucesso! 💎");
  };

  const handleBuyCoinsPackage = (packageId: string) => {
    const selectedPackage = moedasPackages.find((pkg) => pkg.id === packageId);
    if (!selectedPackage) return;

    setCheckoutPackage({
      id: selectedPackage.id,
      name: selectedPackage.name,
      coins: selectedPackage.coins,
      price: selectedPackage.price,
    });
    setPixCode(`00020126580014BR.GOV.BCB.PIX0136NEXUS-${selectedPackage.id}-${crypto.randomUUID()}`);
    setCopiedPix(false);
  };

  const handleConfirmPixPayment = async () => {
    if (!checkoutPackage || loadingPackageId) return;
    setLoadingPackageId(checkoutPackage.id);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const novoSaldo = coins + checkoutPackage.coins;
    setCoins(novoSaldo);
    localStorage.setItem("nexus_coins", novoSaldo.toString());
    setLoadingPackageId(null);
    alert(`${checkoutPackage.name} aprovado! +${checkoutPackage.coins} NX$ adicionados à sua carteira.`);
    setCheckoutPackage(null);
    setPixCode("");
  };

  const handleVipSubscription = (planId: string, price: number) => {
    if (activeVipPlan === planId) {
      alert("Este plano VIP já está ativo na sua conta.");
      return;
    }

    const currentCoins = Number(localStorage.getItem("nexus_coins") ?? coins);
    const safeCoins = Number.isFinite(currentCoins) && currentCoins >= 0 ? currentCoins : 0;
    const currentStreak = Number(localStorage.getItem("nexus_streak") ?? streak);
    const safeStreak = Number.isFinite(currentStreak) ? currentStreak : 0;

    if (safeCoins < price) {
      alert(`Saldo insuficiente! Este plano custa ${price} NX$. Visite a Carteira para minerar ou comprar mais moedas.`);
      return;
    }

    if (safeStreak < 7) {
      alert("Requisito de Fidelidade não atingido! Assinaturas VIP exigem uma ofensiva ativa de 7 dias.");
      return;
    }

    const remainingCoins = safeCoins - price;
    setCoins(remainingCoins);
    setActiveVipPlan(planId);
    localStorage.setItem("nexus_coins", String(remainingCoins));
    localStorage.setItem("nexus_vip_plan", planId);
    alert(`Plano ${vipPlans.find((plan) => plan.id === planId)?.name ?? "VIP"} ativado com sucesso!`);
  };

  const handleCashoutRequest = () => {
    const currentCoins = Number(localStorage.getItem("nexus_coins") ?? coins);
    const safeCoins = Number.isFinite(currentCoins) && currentCoins >= 0 ? currentCoins : 0;

    if (safeCoins < 1000) {
      alert("Saldo mínimo para resgate: 1000 NX$. Continue minerando para liberar o cash-out.");
      return;
    }

    setCashoutOpen(true);
  };

  const confirmCashout = () => {
    const trimmedPixKey = pixKey.trim();
    if (!trimmedPixKey) {
      alert("Informe sua Chave Pix para solicitar o resgate.");
      return;
    }

    const grossCoins = Number(localStorage.getItem("nexus_coins") ?? coins);
    if (!Number.isFinite(grossCoins) || grossCoins < 1000) {
      setCashoutOpen(false);
      alert("Saldo insuficiente para concluir o cash-out.");
      return;
    }

    const platformFee = Math.floor(grossCoins * 0.2);
    const netCoins = grossCoins - platformFee;
    const netReais = netCoins * 0.01;

    setCoins(0);
    localStorage.setItem("nexus_coins", "0");
    setCashoutReceipt({ grossCoins, platformFee, netCoins, netReais, pixKey: trimmedPixKey });
    setCashoutOpen(false);
    setPixKey("");
  };

  return (
    <AppShell activePath="/carteira">
      <div className="w-full max-w-3xl mx-auto p-4 pb-12 space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sua Carteira</h1>

      {checkoutPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Gateway de pagamento Pix">
          <div className="relative w-full max-w-md rounded-3xl border border-amber-500/30 bg-card p-5 shadow-2xl sm:p-6">
            <button type="button" onClick={() => setCheckoutPackage(null)} className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Fechar gateway Pix">
              <X className="h-4 w-4" />
            </button>
            <div className="pr-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Gateway Pix Nexus</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{checkoutPackage.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{checkoutPackage.coins} NX$ por {checkoutPackage.price}</p>
            </div>

            <div className="mt-5 flex justify-center rounded-2xl border border-border bg-zinc-100 p-5 dark:bg-zinc-900">
              <div className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-xl border-4 border-dashed border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                <QrCode className="h-20 w-20" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">QR Pix simulado</span>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="pix-copy-paste" className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Pix Copia e Cola</label>
              <div className="mt-2 flex gap-2">
                <input id="pix-copy-paste" readOnly value={pixCode} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground outline-none" />
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard?.writeText(pixCode); setCopiedPix(true); }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                >
                  {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPix ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmPixPayment}
              disabled={Boolean(loadingPackageId)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-4 py-3 text-xs font-black text-amber-950 transition-all hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
            >
              {loadingPackageId ? "Confirmando com o banco..." : "Confirmar Pagamento (Simular Aprovação)"}
            </button>
          </div>
        </div>
      )}
          <p className="text-xs text-muted-foreground mt-0.5">Participe diariamente da rede para minerar moedas e desbloquear cosméticos.</p>
        </div>

        {/* INDICADOR DE OFENSIVA ESTILO DUOLINGO */}
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full text-amber-500 font-bold text-xs">
          <Flame className="w-4 h-4 fill-amber-500" />
          <span>{streak} Dias Seguidos</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD DO SALDO */}
        <div className="md:col-span-2 relative overflow-hidden bg-zinc-950 text-white p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Saldo Verificado</p>
            <Wallet className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <Coins className="w-6 h-6 text-amber-400 self-center" />
            <span className="text-3xl font-black tracking-tight">{coins}</span>
            <span className="text-xs font-bold text-zinc-500 tracking-wider">NX\$ COINS</span>
          </div>
          <button
            type="button"
            onClick={handleCashoutRequest}
            className="mt-5 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
          >
            Solicitar Resgate (Cash-out)
          </button>
        </div>

        {/* CARD DO SISTEMA DE RETENÇÃO */}
        <div className="bg-zinc-900/50 dark:bg-zinc-900/30 border border-border p-5 rounded-2xl flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Award className="w-3.5 h-3.5 text-amber-500" /> MINERAÇÃO DIÁRIA
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Próximo resgate: <span className="font-bold text-foreground">+{ganhoHoje} NX\$</span>. 
              {proximoBonusEmDias === 1 ? " Amanhã é o Grande Bônus de +100!" : ` Faltam ${proximoBonusEmDias} dias para o Super Baú.`}
            </p>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={dailyClaimed}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
              dailyClaimed
                ? "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border cursor-not-allowed opacity-60"
                : "bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-[0.98] shadow-md shadow-amber-400/5"
            }`}
          >
            {dailyClaimed ? "Coletado Hoje" : `Coletar Moedas`}
          </button>
        </div>
      </div>

      {/* LOJA RECALIBRADA - ARTIGOS DE LUXO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Mercado de Cosméticos Raros</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lojaCores.map((cor) => {
            const jaComprou = purchasedColors.includes(cor.id);
            const equipado = activeColor === cor.id;

            return (
              <div key={cor.id} className="bg-background border border-border p-4 rounded-xl flex items-center justify-between shadow-sm hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-border ${cor.classe}`}>
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${cor.classe}`}>{cor.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Coins className="w-3 h-3 text-amber-500" /> {cor.preco} NX\$
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyColor(cor.id, cor.preco)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    equipado
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 cursor-default"
                      : jaComprou
                      ? "bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border"
                      : "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 font-semibold hover:opacity-90 active:scale-95"
                  }`}
                >
                  {equipado ? <><Check className="w-3 h-3" /> Ativo</> : jaComprou ? "Equipar" : "Comprar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/30 p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-amber-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Loja de Câmbio</h2>
                <p className="text-[11px] text-zinc-300">Injetar fundos com Pix em segundos</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="w-3 h-3" />
              Verificado
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 pb-12 md:grid-cols-3">
          {moedasPackages.map((pkg) => {
            const isLoading = loadingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`relative flex h-full flex-col overflow-visible rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
                  pkg.highlight
                    ? "border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-background to-yellow-500/10 shadow-[0_12px_30px_rgba(251,191,36,0.12)]"
                    : "border-border bg-background"
                }`}
              >
                <div className={`mb-4 rounded-xl bg-gradient-to-r ${pkg.accent} p-[1px]`}>
                  <div className="rounded-[10px] bg-background/90 px-2.5 py-2 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/80">{pkg.badge}</span>
                  </div>
                </div>

                {pkg.highlight && (
                  <span className="absolute -top-3 left-4 inline-flex items-center rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-950 shadow-lg shadow-amber-500/20">
                    Mais Vendido
                  </span>
                )}

                <div className="space-y-4 pt-1 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{pkg.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Pagamento via Pix</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500">
                      +{pkg.coins} NX$
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="text-2xl font-black text-foreground">{pkg.price}</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>

                  <div className="mt-auto">
                    <button
                      type="button"
                      onClick={() => handleBuyCoinsPackage(pkg.id)}
                      disabled={isLoading}
                      className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isLoading
                          ? "bg-amber-500/80 text-amber-950 cursor-wait shadow-lg shadow-amber-500/20"
                          : pkg.highlight
                          ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-amber-950 hover:brightness-105"
                          : "bg-zinc-950 text-white hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
                      }`}
                    >
                      {isLoading ? "Aprovando Pix..." : "Comprar no Pix"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cashoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Solicitar cash-out">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-card p-5 shadow-2xl">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">Resgate de saldo</p>
              <h2 className="mt-2 text-xl font-black text-foreground">Solicitar Cash-out</h2>
              <p className="mt-1 text-sm text-muted-foreground">A plataforma retém 20% de taxa de mediação.</p>
            </div>
            <label htmlFor="cashout-pix" className="text-xs font-semibold text-muted-foreground">Chave Pix</label>
            <input
              id="cashout-pix"
              value={pixKey}
              onChange={(event) => setPixKey(event.target.value)}
              placeholder="CPF, e-mail ou chave aleatória"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setCashoutOpen(false); setPixKey(""); }} className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
              <button type="button" onClick={confirmCashout} className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-2 text-xs font-black text-amber-950 hover:brightness-105">Confirmar resgate</button>
            </div>
          </div>
        </div>
      )}

      {cashoutReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Recibo de cash-out">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">Transferência simulada</p>
            <h2 className="mt-2 text-xl font-black text-foreground">Resgate solicitado</h2>
            <div className="mt-5 space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Saldo bruto</span><strong>{cashoutReceipt.grossCoins} NX$</strong></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Taxa Nexus (20%)</span><strong className="text-rose-500">- {cashoutReceipt.platformFee} NX$</strong></div>
              <div className="flex justify-between gap-3 border-t border-border pt-3"><span className="font-semibold text-foreground">Valor líquido</span><strong className="text-emerald-500">{cashoutReceipt.netCoins} NX$ · R$ {cashoutReceipt.netReais.toFixed(2).replace(".", ",")}</strong></div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground">Pix: {cashoutReceipt.pixKey}</div>
            </div>
            <button type="button" onClick={() => setCashoutReceipt(null)} className="mt-5 w-full rounded-xl bg-foreground px-3 py-2.5 text-xs font-bold text-background hover:opacity-90">Fechar recibo</button>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Planos de Assinatura VIP</h2>
          </div>
          {activeVipPlan && <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-500">Plano ativo</span>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {vipPlans.map((plan) => {
            const isActive = activeVipPlan === plan.id;

            return (
              <article key={plan.id} className={`relative flex h-full flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${plan.accent}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70">{plan.badge}</span>
                  <Gem className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="mt-5 text-base font-black text-foreground">{plan.name}</h3>
                <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{plan.benefit}</p>
                <div className="mt-5 flex items-baseline gap-1 border-t border-border/60 pt-4">
                  <span className="text-2xl font-black text-foreground">{plan.price}</span>
                  <span className="text-xs font-bold text-amber-500">NX$</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleVipSubscription(plan.id, plan.price)}
                  disabled={isActive}
                  className={`mt-5 w-full rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "cursor-default border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : plan.id === "ouro-vip"
                      ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-amber-950 hover:brightness-105"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {isActive ? "Plano ativo" : "Assinar"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
      </div>
    </AppShell>
  );
}

export default function CarteiraPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-muted-foreground">Carregando carteira...</div>}>
      <CarteiraContent />
    </Suspense>
  );
}
