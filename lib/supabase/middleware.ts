import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_ROUTES = ["/feed", "/perfil", "/carteira", "/configuracoes"];
const AUTH_ROUTES = ["/login", "/cadastro"];

/**
 * Atualiza (refresh) a sessão a cada requisição e propaga o cookie
 * renovado tanto para a request quanto para a response — inclusive quando
 * a resposta final é um redirect, para que o navegador nunca fique com um
 * cookie de sessão desatualizado.
 *
 * Regras de acesso:
 *  1. Não autenticado tentando rota privada -> redirect para /login
 *  2. Autenticado tentando /login ou /cadastro -> redirect para /feed
 */
export async function updateSession(request: NextRequest) {
  // Resposta "base": qualquer cookie renovado é escrito aqui primeiro.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propaga para a request (para que o próprio middleware/Server
          // Components downstream já enxerguem o cookie atualizado)...
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // ...e recria a response a partir dessa request atualizada, para
          // não perder cookies já setados em chamadas anteriores de setAll.
          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            })
          );
        },
      },
    }
  );

  // Importante: NÃO trocar por `getSession()`. `getUser()` valida o token
  // contra o servidor Supabase a cada chamada — é o que impede sessões
  // forjadas, adulteradas ou já expiradas de passarem no middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPrivateRoute = PRIVATE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Regra 1: sem sessão + rota privada -> /login
  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname); // volta pra rota original após login
    return redirectWithFreshCookies(url, response);
  }

  // Regra 2: com sessão + /login ou /cadastro -> /feed
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return redirectWithFreshCookies(url, response);
  }

  // Regra 3 (caminho feliz): devolve a response com os cookies renovados,
  // mesmo quando nenhum redirect acontece.
  return response;
}

/**
 * Cria a resposta de redirect e copia para ela todos os cookies que o
 * Supabase acabou de renovar em `sourceResponse`. Sem isso, um redirect
 * "engoliria" o refresh de sessão feito acima — o navegador ficaria com o
 * cookie antigo e o próximo request cairia em loop de expiração.
 */
function redirectWithFreshCookies(url: URL, sourceResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
