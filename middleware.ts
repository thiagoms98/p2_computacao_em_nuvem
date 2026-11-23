import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;
  if (!configuredPassword) {
    return new NextResponse("Configure APP_ACCESS_PASSWORD para habilitar o acesso à aplicação.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = atob(authorization.slice(6));
      const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
      const credentials = new TextDecoder().decode(bytes);
      if (credentials === `aluno:${configuredPassword}`) return NextResponse.next();
    } catch {
      // Invalid Basic auth is handled by the challenge below.
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Migração Drive para Azure", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
