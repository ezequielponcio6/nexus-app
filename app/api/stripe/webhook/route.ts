import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Webhook do Stripe desativado: a ativação de Nexus Pro agora é local e não depende de assinatura externa.",
    },
    { status: 410 }
  );
}
