# Guia para crear y conectar un MCP local a un agente de ChatGPT

Esta guia documenta el flujo validado para conectar un servidor MCP local a un
agente de ChatGPT usando Developer Mode y Secure MCP Tunnels.

## Objetivo

Permitir que un agente de ChatGPT use herramientas MCP que corren en un
ordenador local, sin exponer el servidor directamente a internet.

Arquitectura:

```text
Agente de ChatGPT
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client en el ordenador local
  -> servidor MCP local HTTP
  -> API externa, base de datos o servicio final
```

## Requisitos

- Proyecto MCP con endpoint HTTP Streamable.
- Node.js instalado.
- Developer Mode activado en ChatGPT.
- Acceso a OpenAI Platform para crear un tunnel.
- `tunnel-client` descargado en el proyecto.
- Una API key de OpenAI valida para usar el tunnel.
- Credenciales del servicio final, por ejemplo X Developer si el MCP publica en X.

No pegar tokens, API keys ni secrets en chats, issues o commits.

## 1. Preparar el servidor MCP local

Instalar dependencias:

```powershell
npm install
```

Configurar `.env` local. Ejemplo para este MCP de X:

```env
X_MCP_ACCOUNT=fcbnews2026
X_MCP_MODE=read-write
X_MCP_TRANSPORT=http
X_MCP_HTTP_PORT=3001
X_MCP_HTTP_PATH=/mcp
X_API_BASE_URL=https://api.x.com
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=...
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=...
```

Arrancar el servidor HTTP:

```powershell
npm run dev:http
```

Validar salud local:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Resultado esperado:

```json
{"ok":true,"transport":"http","activeAccount":"fcbnews2026","mode":"read-write"}
```

## 2. Crear el tunnel en OpenAI Platform

Ir a:

```text
https://platform.openai.com/settings/organization/tunnels
```

Crear un tunnel con:

```text
Name: <nombre del MCP> tunnel
Description: Local development tunnel for <nombre del MCP>
Organization: la organizacion correcta
ChatGPT workspace: el workspace donde estara el agente
```

Guardar el `tunnel_id`. Ejemplo:

```text
tunnel_...
```

## 3. Descargar o verificar tunnel-client

En este proyecto usamos:

```text
.tools/tunnel-client/tunnel-client.exe
```

Comprobar que responde:

```powershell
.\.tools\tunnel-client\tunnel-client.exe --help
```

## 4. Crear el perfil local del tunnel-client

El perfil vive fuera del repo:

```text
C:\Users\<usuario>\AppData\Roaming\tunnel-client\<perfil>.yaml
```

Ejemplo de perfil:

```yaml
config_version: 1
control_plane:
  base_url: "https://api.openai.com"
  tunnel_id: "tunnel_..."
  api_key: "env:CONTROL_PLANE_API_KEY"
health:
  listen_addr: "127.0.0.1:8080"
admin_ui:
  open_browser: false
log:
  level: info
  format: json
mcp:
  server_urls:
    - channel: main
      url: "http://127.0.0.1:3001/mcp"
```

Puntos importantes:

- El tunnel de Platform solo guarda el `tunnel_id`.
- La URL local del MCP se configura en el perfil YAML.
- Para ChatGPT se selecciona el tunnel, no una URL local.

## 5. Configurar la API key del tunnel

En PowerShell:

```powershell
$k = Read-Host "Pega la Tunnel API key"
$k = $k.Trim()
$env:CONTROL_PLANE_API_KEY = $k
[Environment]::SetEnvironmentVariable("CONTROL_PLANE_API_KEY", $k, "User")
```

Validar:

```powershell
.\.tools\tunnel-client\tunnel-client.exe doctor --profile <perfil> --explain
```

Resultado esperado:

```text
RESULT ok
```

## 6. Arrancar el tunnel

En una terminal dedicada:

```powershell
.\.tools\tunnel-client\tunnel-client.exe run --profile <perfil>
```

Mantener esa terminal abierta.

Validar desde otra terminal:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

Resultado aceptable:

```text
200 ready
```

Tambien puede aparecer:

```text
ready (mcp startup probe timed out: ...)
```

Si el status HTTP es `200`, el tunnel esta listo.

## 7. Crear el MCP personalizado en ChatGPT

En el agente de ChatGPT:

```text
Agregar app / herramienta
MCP personalizado
Crear aplicacion
```

Configurar:

```text
Nombre: <nombre visible del MCP>
Descripcion: <que hace el MCP>
Conexion: Tunel
Tunel: <tunnel creado en Platform>
Autenticacion: Sin autenticacion
```

Usar `Sin autenticacion` cuando la autenticacion del servicio final esta
gestionada dentro del servidor MCP local, por ejemplo en `.env`.

No usar OAuth de ChatGPT salvo que el propio servidor MCP implemente discovery
OAuth y autenticacion de recurso MCP.

Marcar el aviso de riesgo y crear.

## 8. Prueba inicial desde el agente

Primero probar una herramienta de lectura:

```text
Usa el MCP <nombre> para consultar la cuenta activa. No publiques nada.
```

Para este MCP de X:

```text
Usa el MCP FCBNews2026 X MCP para ejecutar x_get_me. No publiques nada.
```

Resultado esperado:

```text
username: FCBNews2026
name: FCB News
```

Solo despues probar herramientas de escritura.

## 9. Publicacion de prueba controlada

Antes de publicar, confirmar:

- Cuenta activa correcta.
- `X_MCP_MODE=read-write`.
- Token con scope de escritura.
- Texto exacto aprobado.

Prompt recomendado:

```text
Usa el MCP <nombre> para publicar exactamente este texto:
"Prueba tecnica de publicacion desde MCP."
Devuelveme el post_id.
```

No registrar nada como publicado hasta recibir `post_id`.

## 10. Reautorizar X si aparece 401

Si el agente dice:

```text
401 Unauthorized
```

y el MCP ya responde, el problema suele ser el token del servicio final.

Para X, configurar en X Developer:

```text
Callback URI:
http://127.0.0.1:3002/callback

Website URL:
http://127.0.0.1:3002

App permissions:
Read and write
```

Configurar el Client ID:

```powershell
$env:X_OAUTH_CLIENT_ID = "<OAuth 2.0 Client ID de X Developer>"
$env:X_MCP_ACCOUNT = "fcbnews2026"
npm run x:oauth
```

Abrir la URL generada estando logueado en X con la cuenta correcta.

El helper guardara en `.env`:

```env
X_ACCOUNT_FCBNEWS2026_USER_ACCESS_TOKEN=...
X_ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=...
```

Reiniciar el MCP:

```powershell
# Ctrl+C en npm run dev:http
npm run dev:http
```

Validar localmente:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Despues repetir `x_get_me` desde el agente.

## Troubleshooting

### `doctor` falla con `CONTROL_PLANE_API_KEY is not set`

Configurar la variable:

```powershell
$env:CONTROL_PLANE_API_KEY = Read-Host "Tunnel API key"
[Environment]::SetEnvironmentVariable("CONTROL_PLANE_API_KEY", $env:CONTROL_PLANE_API_KEY, "User")
```

### `doctor` falla con `control plane API key is malformed`

La key contiene espacios, comillas, saltos de linea u otro caracter invalido.

Repetir:

```powershell
$k = Read-Host "Tunnel API key"
$k = $k.Trim()
$env:CONTROL_PLANE_API_KEY = $k
[Environment]::SetEnvironmentVariable("CONTROL_PLANE_API_KEY", $k, "User")
```

### `run` da `401 Unauthorized`

La key existe pero no tiene acceso al tunnel correcto o pertenece a otra
organizacion/proyecto.

Revisar:

- Organizacion seleccionada en Platform.
- Workspace asociado al tunnel.
- API key usada por `CONTROL_PLANE_API_KEY`.

### ChatGPT no crea el MCP

Comprobar:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

Tambien comprobar que el modal de ChatGPT usa:

```text
Conexion: Tunel
Autenticacion: Sin autenticacion
```

### El agente llega al MCP pero el servicio final devuelve `401`

El tunnel y el MCP estan bien. Reautorizar o regenerar credenciales del servicio
final. En el caso de X, ejecutar `npm run x:oauth`.

## Checklist rapida para proximos MCPs

- [ ] Servidor MCP HTTP funciona en local.
- [ ] `/healthz` responde.
- [ ] Herramienta de lectura basica funciona localmente.
- [ ] Tunnel creado en OpenAI Platform.
- [ ] Perfil `tunnel-client` apunta al endpoint local correcto.
- [ ] `CONTROL_PLANE_API_KEY` configurada.
- [ ] `tunnel-client doctor --profile <perfil> --explain` devuelve `RESULT ok`.
- [ ] `tunnel-client run --profile <perfil>` queda abierto.
- [ ] `/readyz` devuelve HTTP 200.
- [ ] MCP personalizado creado en ChatGPT con `Conexion: Tunel`.
- [ ] Primera prueba del agente usa solo lectura.
- [ ] Escritura probada solo con texto exacto aprobado.
