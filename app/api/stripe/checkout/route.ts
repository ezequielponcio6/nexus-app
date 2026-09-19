import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Nexus Pro foi desativado no fluxo de Stripe. A assinatura agora é processada localmente com nexus_coins.",
    },
    { status: 410 }
  );
}
