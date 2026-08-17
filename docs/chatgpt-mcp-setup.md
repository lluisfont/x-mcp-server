# Guia paso a paso para crear un MCP local y conectarlo a ChatGPT

Esta guia define el procedimiento recomendado para crear proximos servidores MCP
locales y conectarlos a agentes de ChatGPT mediante un tunel seguro de OpenAI.

La idea es seguir siempre el mismo orden:

```text
1. Crear el MCP local
2. Exponerlo por HTTP local
3. Crear el tunel en OpenAI Platform
4. Configurar tunnel-client en el ordenador
5. Crear la aplicacion MCP en ChatGPT
6. Probar primero lectura y despues escritura
```

## Arquitectura

```text
Agente de ChatGPT
  -> Secure MCP Tunnel de OpenAI
  -> tunnel-client en el ordenador local
  -> servidor MCP local HTTP
  -> servicio final
```

Ejemplos de servicio final:

- X/Twitter
- Base de datos
- CRM
- API interna
- Sistema de archivos local controlado
- Herramientas propias de la empresa

## Requisitos previos

Antes de empezar, tener preparado:

- Cuenta de ChatGPT con Developer Mode activado.
- Acceso a OpenAI Platform.
- Permiso para crear tunnels en la organizacion correcta.
- `tunnel-client` descargado en el ordenador.
- Node.js instalado si el MCP esta hecho en TypeScript.
- Un servidor MCP que pueda ejecutarse en HTTP local.
- Credenciales del servicio final, guardadas localmente y nunca en el repo.

## 1. Definir el MCP

Antes de escribir codigo, definir claramente:

- Nombre del MCP.
- Servicio externo al que se conecta.
- Cuenta o perfil por defecto.
- Herramientas de solo lectura.
- Herramientas de escritura.
- Modo seguro por defecto.

Ejemplo:

```text
Nombre: FCBNews2026 X MCP
Servicio: X API
Cuenta por defecto: fcbnews2026
Modo por defecto: read-only
Herramientas de lectura: get_me, get_user, search_posts
Herramientas de escritura: create_post, reply_post
```

Recomendacion:

- El MCP debe arrancar en `read-only` por defecto.
- Las acciones de escritura deben requerir una configuracion explicita.
- Las credenciales deben vivir en `.env` local o en el gestor de secretos del
  ordenador.

## 2. Crear la configuracion local

Crear un `.env.example` sin secretos reales.

Ejemplo:

```env
MCP_TRANSPORT=http
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3001
MCP_HTTP_PATH=/mcp

MCP_MODE=read-only
MCP_ACTIVE_ACCOUNT=default

SERVICE_API_BASE_URL=https://api.example.com
SERVICE_ACCESS_TOKEN=
SERVICE_REFRESH_TOKEN=
```

Despues, crear el `.env` local real a partir del ejemplo.

Reglas:

- `.env` no se commitea.
- `.env.example` si se commitea.
- No se pegan tokens en chats, issues, PRs ni documentacion.
- Si hay varias cuentas, cada una debe tener claves separadas.

Ejemplo multicuentas:

```env
MCP_ACTIVE_ACCOUNT=fcbnews2026
MCP_MODE=read-write

ACCOUNT_FCBNEWS2026_ACCESS_TOKEN=
ACCOUNT_FCBNEWS2026_REFRESH_TOKEN=

ACCOUNT_LLUISFONT_ACCESS_TOKEN=
ACCOUNT_LLUISFONT_REFRESH_TOKEN=
```

## 3. Implementar el transporte HTTP MCP

El servidor debe exponer un endpoint HTTP local para MCP.

Configuracion recomendada:

```text
Host: 127.0.0.1
Port: 3001
Path: /mcp
Health: /healthz
```

El endpoint final del MCP sera:

```text
http://127.0.0.1:3001/mcp
```

El servidor tambien debe tener un endpoint de salud:

```text
http://127.0.0.1:3001/healthz
```

Respuesta recomendada de `/healthz`:

```json
{
  "ok": true,
  "transport": "http",
  "activeAccount": "fcbnews2026",
  "mode": "read-only"
}
```

## 4. Arrancar y probar el MCP local

Instalar dependencias:

```powershell
npm install
```

Arrancar el servidor:

```powershell
npm run dev:http
```

Validar salud:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Antes de seguir, comprobar:

- El proceso queda arrancado.
- `/healthz` responde.
- La cuenta activa es la esperada.
- El modo es el esperado.
- Hay al menos una herramienta de lectura que funciona localmente.

## 5. Crear el tunnel en OpenAI Platform

Abrir:

```text
https://platform.openai.com/settings/organization/tunnels
```

Crear un tunnel nuevo.

Valores recomendados:

```text
Name: <Nombre del MCP> tunnel
Description: Local development tunnel for <Nombre del MCP> running on this computer.
Organization: organizacion correcta
ChatGPT workspace: workspace donde se usara el agente
```

Guardar el `tunnel_id`.

Ejemplo:

```text
tunnel_6a82...
```

Importante:

- El tunnel de Platform no guarda la URL local del MCP.
- La URL local se configura despues en el perfil de `tunnel-client`.
- El `tunnel_id` identifica el tunel que ChatGPT podra seleccionar.

## 6. Crear o seleccionar una Tunnel API key

La Tunnel API key se crea en OpenAI Platform y se usa para que
`tunnel-client` pueda conectarse al control plane del tunnel.

Configurarla en PowerShell:

```powershell
$k = Read-Host "Tunnel API key"
$k = $k.Trim()
$env:CONTROL_PLANE_API_KEY = $k
[Environment]::SetEnvironmentVariable("CONTROL_PLANE_API_KEY", $k, "User")
```

La variable esperada por el perfil sera:

```text
CONTROL_PLANE_API_KEY
```

## 7. Crear el perfil local de tunnel-client

El perfil vive en el ordenador, fuera del repo.

Ruta en Windows:

```text
C:\Users\<usuario>\AppData\Roaming\tunnel-client\<profile>.yaml
```

Ejemplo para un MCP local en el puerto `3001`:

```yaml
config_version: 1
control_plane:
  base_url: "https://api.openai.com"
  tunnel_id: "tunnel_6a82..."
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

Sustituir:

- `tunnel_id` por el ID real del tunnel.
- `url` por la URL local real del MCP.
- `<profile>` por un nombre corto y estable.

Ejemplo de nombre de perfil:

```text
x-fcbnews
crm-local
noticias-mcp
```

## 8. Validar tunnel-client

Con el MCP local arrancado, ejecutar:

```powershell
.\.tools\tunnel-client\tunnel-client.exe doctor --profile <profile> --explain
```

Resultado esperado:

```text
RESULT ok
```

Comprobaciones clave:

```text
control_plane_api_key    PASS
tunnel_id                PASS
mcp_target               PASS
mcp_server_reachable     PASS
```

No continuar hasta que `doctor` devuelva `RESULT ok`.

## 9. Arrancar el tunnel

Abrir una terminal dedicada y ejecutar:

```powershell
.\.tools\tunnel-client\tunnel-client.exe run --profile <profile>
```

Mantener esta terminal abierta mientras se use el MCP desde ChatGPT.

Validar desde otra terminal:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

Resultado esperado:

```text
StatusCode: 200
```

## 10. Crear la aplicacion MCP en ChatGPT

En el editor del agente:

```text
Agregar app / herramienta
MCP personalizado
Crear aplicacion
```

Rellenar:

```text
Nombre: <Nombre visible del MCP>
Descripcion: <Descripcion corta de lo que hace>
Conexion: Tunel
Tunel: <tunnel creado en OpenAI Platform>
Autenticacion: Sin autenticacion
```

Usar `Sin autenticacion` cuando:

- El MCP corre localmente en tu ordenador.
- ChatGPT accede a traves del tunnel.
- Las credenciales del servicio final estan gestionadas por el propio MCP.

Usar OAuth en ChatGPT solo si:

- El servidor MCP implementa OAuth para ChatGPT.
- Expone correctamente metadata OAuth.
- El flujo OAuth esta disenado para autenticar al usuario de ChatGPT contra el
  MCP, no contra el servicio final directamente.

Para MCPs locales controlados por nosotros, la configuracion normal es:

```text
Conexion: Tunel
Autenticacion: Sin autenticacion
```

## 11. Primera prueba desde el agente

La primera prueba siempre debe ser de solo lectura.

Prompt recomendado:

```text
Usa el MCP <Nombre del MCP> para consultar la cuenta activa. No publiques nada.
```

El resultado debe confirmar:

- El MCP responde.
- La cuenta activa es correcta.
- El agente puede usar las herramientas.
- No se ha ejecutado ninguna accion de escritura.

Ejemplo para X:

```text
Usa el MCP FCBNews2026 X MCP para ejecutar x_get_me. No publiques nada.
```

## 12. Activar escritura solo cuando lectura este validada

Antes de publicar, comprobar:

- El MCP esta en `read-write`.
- La cuenta activa es correcta.
- El token del servicio final tiene permisos de escritura.
- El texto exacto esta aprobado.
- El agente entiende que debe devolver el ID de la accion creada.

Prompt recomendado:

```text
Usa el MCP <Nombre del MCP> para publicar exactamente este texto:
"Prueba tecnica de publicacion desde MCP."
Devuelveme el ID generado por el servicio.
```

Para X, no considerar la publicacion completada hasta recibir un `post_id`.

## 13. Reautorizar el servicio final cuando sea necesario

Si el MCP responde pero el servicio final devuelve `401 Unauthorized`, hay que
renovar las credenciales del servicio final.

Ejemplo para X:

1. En X Developer, configurar la app con permisos `Read and write`.
2. Configurar callback local:

```text
http://127.0.0.1:3002/callback
```

3. Configurar website local:

```text
http://127.0.0.1:3002
```

4. Ejecutar el helper OAuth local:

```powershell
$env:X_OAUTH_CLIENT_ID = "<OAuth 2.0 Client ID>"
$env:X_MCP_ACCOUNT = "fcbnews2026"
npm run x:oauth
```

5. Abrir la URL generada con la cuenta correcta de X.
6. Autorizar.
7. Reiniciar el MCP local.
8. Repetir la prueba de lectura desde ChatGPT.

## Plantilla rapida para nuevos MCPs

Copiar esta estructura para cada nuevo MCP:

```text
Nombre del MCP:
Servicio final:
Cuenta/perfil por defecto:
Puerto local:
Path MCP:
Path health:
Modo por defecto:
Herramientas de lectura:
Herramientas de escritura:
Tunnel name:
Tunnel ID:
tunnel-client profile:
ChatGPT workspace:
```

Ejemplo:

```text
Nombre del MCP: FCBNews2026 X MCP
Servicio final: X API
Cuenta/perfil por defecto: fcbnews2026
Puerto local: 3001
Path MCP: /mcp
Path health: /healthz
Modo por defecto: read-only
Herramientas de lectura: x_get_me, x_get_user, x_get_post, x_search_posts
Herramientas de escritura: x_create_post, x_reply_post
Tunnel name: FCBNews2026 X MCP tunnel
Tunnel ID: tunnel_6a82...
tunnel-client profile: x-fcbnews
ChatGPT workspace: Area de Trabajo Font
```

## Checklist final

- [ ] `.env.example` existe y no contiene secretos.
- [ ] `.env` local contiene credenciales reales.
- [ ] El MCP arranca por HTTP local.
- [ ] `/healthz` responde.
- [ ] La cuenta activa es correcta.
- [ ] El modo inicial es seguro.
- [ ] El tunnel existe en OpenAI Platform.
- [ ] Existe una Tunnel API key configurada en `CONTROL_PLANE_API_KEY`.
- [ ] El perfil YAML apunta a `http://127.0.0.1:<puerto>/mcp`.
- [ ] `tunnel-client doctor --profile <profile> --explain` devuelve `RESULT ok`.
- [ ] `tunnel-client run --profile <profile>` queda ejecutandose.
- [ ] `/readyz` devuelve HTTP 200.
- [ ] El MCP personalizado en ChatGPT usa `Conexion: Tunel`.
- [ ] El MCP personalizado en ChatGPT usa `Autenticacion: Sin autenticacion`.
- [ ] La primera prueba desde el agente es de solo lectura.
- [ ] La escritura se prueba solo despues de validar lectura.
