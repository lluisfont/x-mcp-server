# Arquitectura del proyecto

Este proyecto implementa un servidor MCP para X usando TypeScript y la API
oficial de X.

## Componentes

```text
src/index.ts
  -> entrada stdio

src/http.ts
  -> entrada HTTP local
  -> endpoint /healthz
  -> endpoint MCP /mcp

src/server.ts
  -> definicion de herramientas MCP
  -> validacion de inputs con Zod
  -> control de modo read-only/read-write

src/config.ts
  -> carga de variables de entorno
  -> seleccion de cuenta activa
  -> configuracion de transporte

src/x/client.ts
  -> cliente HTTP de la API de X
  -> gestion uniforme de errores de X

scripts/x-oauth-authorize.ts
  -> helper local OAuth 2.0 + PKCE
  -> guarda tokens en .env

tests/
  -> pruebas unitarias de configuracion y cliente X
```

## Flujo stdio

```text
MCP host local
  -> lanza npm run dev
  -> src/index.ts
  -> buildServer(config)
  -> herramientas MCP
  -> X API
```

Este modo se usa cuando el host MCP ejecuta el proceso local directamente.

## Flujo HTTP local

```text
Cliente MCP remoto o tunnel-client
  -> http://127.0.0.1:3001/mcp
  -> src/http.ts
  -> Streamable HTTP transport
  -> buildServer(config)
  -> herramientas MCP
  -> X API
```

Este modo se usa para conectar con ChatGPT mediante Secure MCP Tunnels.

## Flujo ChatGPT con tunnel

```text
Agente de ChatGPT
  -> MCP personalizado
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client en el ordenador local
  -> http://127.0.0.1:3001/mcp
  -> x-mcp-server
  -> X API
```

La URL local no se configura en ChatGPT. Se configura en el perfil local de
`tunnel-client`.

## Modelo de cuentas

La cuenta activa se selecciona con:

```env
X_MCP_ACCOUNT=<account>
```

Para `X_MCP_ACCOUNT=fcbnews2026`, el servidor busca:

```env
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN
```

Para `X_MCP_ACCOUNT=default`, tambien acepta:

```env
X_USER_ACCESS_TOKEN
```

El nombre de cuenta es una etiqueta local. La identidad real se comprueba contra
X con `x_get_active_account` o `x_get_me`.

## Modelo de seguridad

El servidor tiene dos niveles:

```env
X_MCP_MODE=read-only
X_MCP_MODE=read-write
```

En `read-only`, las herramientas de escritura devuelven error antes de llamar a
X.

En `read-write`, el servidor permite escritura, pero X todavia exige que el
token tenga el scope correcto.

## Gestion de errores

Los errores de X se normalizan como resultados MCP de error:

```json
{
  "error": "x_api_error",
  "status": 401,
  "message": "...",
  "details": {}
}
```

Los errores internos se devuelven como:

```json
{
  "error": "internal_error",
  "message": "..."
}
```

## Principios de diseno

- Mantener operaciones atomicas en el MCP.
- Dejar flujos editoriales complejos en el agente que llama.
- Mantener escritura desactivada por defecto.
- Evitar guardar secretos en el repositorio.
- Verificar la cuenta activa antes de publicar.
