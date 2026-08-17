# Activar y desactivar el servidor MCP local

Para que un agente de ChatGPT pueda usar este MCP local, deben estar activos dos
procesos en el ordenador:

```text
1. Servidor MCP HTTP local
   -> http://127.0.0.1:3001/mcp

2. tunnel-client
   -> conecta el tunnel de OpenAI con el servidor MCP local
```

Si cualquiera de los dos esta parado, el agente no podra usar las herramientas.

## Modo recomendado

Para desarrollo y primeras pruebas:

```text
Arranque manual
```

Para uso diario en un ordenador dedicado:

```text
Arranque automatico al iniciar sesion en Windows
```

No se recomienda arrancarlo automaticamente en ordenadores compartidos si el MCP
esta en `read-write`.

## 1. Activar manualmente

Abrir una terminal en el repo:

```powershell
cd C:\Repos\x-mcp-server
```

Arrancar el servidor MCP HTTP:

```powershell
npm run dev:http
```

Dejar esa terminal abierta.

Abrir otra terminal en el repo y arrancar el tunnel:

```powershell
cd C:\Repos\x-mcp-server
.\.tools\tunnel-client\tunnel-client.exe run --profile x-fcbnews
```

Dejar tambien esa terminal abierta.

## 2. Verificar que esta activo

Verificar el servidor MCP local:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
```

Resultado esperado:

```json
{"ok":true,"transport":"http","activeAccount":"fcbnews2026","mode":"read-write"}
```

Verificar el tunnel:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

Resultado esperado:

```text
StatusCode: 200
```

Despues, desde ChatGPT, probar una herramienta de lectura:

```text
Usa x_get_active_account. No publiques nada.
```

## 3. Desactivar manualmente

En cada terminal donde esten corriendo los procesos:

```text
Ctrl+C
```

Parar:

- Terminal de `npm run dev:http`.
- Terminal de `tunnel-client run`.

Cuando ambos procesos estan parados, ChatGPT ya no puede acceder al MCP local.

## 4. Cambiar de cuenta o modo

Editar `.env`.

Ejemplo para cambiar cuenta:

```env
X_MCP_ACCOUNT=fcbnews2026
```

Ejemplo para activar escritura:

```env
X_MCP_MODE=read-write
```

Ejemplo para volver a modo seguro:

```env
X_MCP_MODE=read-only
```

Despues de cambiar `.env`, reiniciar el servidor MCP:

```text
Ctrl+C
npm run dev:http
```

El tunnel-client puede seguir abierto si el puerto y path del MCP no cambian.

## 5. Arranque automatico al iniciar Windows

Si el ordenador se usara habitualmente como host del MCP, se puede arrancar el
servidor y el tunnel al iniciar sesion en Windows.

La forma recomendada es usar el Programador de tareas de Windows.

### 5.1 Crear script de arranque

Crear un archivo local fuera del repo o dentro de una carpeta no publicada.

Ejemplo:

```text
C:\Users\<usuario>\mcp-start\x-fcbnews-start.ps1
```

Contenido recomendado:

```powershell
$repo = "C:\Repos\x-mcp-server"
$profile = "x-fcbnews"

Set-Location $repo

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "cd `"$repo`"; npm run dev:http"
) -WindowStyle Minimized

Start-Sleep -Seconds 5

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "cd `"$repo`"; .\.tools\tunnel-client\tunnel-client.exe run --profile $profile"
) -WindowStyle Minimized
```

Este script abre dos ventanas minimizadas:

- Una para el servidor MCP.
- Una para el tunnel.

Mantener ventanas visibles o minimizadas ayuda a parar el servicio con `Ctrl+C`
y ver logs si algo falla.

### 5.2 Crear tarea programada

Abrir PowerShell como usuario normal y ejecutar:

```powershell
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-ExecutionPolicy Bypass -File `"C:\Users\<usuario>\mcp-start\x-fcbnews-start.ps1`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

Register-ScheduledTask `
  -TaskName "X MCP FCBNews2026" `
  -Action $action `
  -Trigger $trigger `
  -Description "Starts the local X MCP server and OpenAI tunnel-client at Windows logon."
```

Sustituir `<usuario>` por el usuario real de Windows.

### 5.3 Probar la tarea

Ejecutar:

```powershell
Start-ScheduledTask -TaskName "X MCP FCBNews2026"
```

Validar:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/healthz | ConvertTo-Json -Compress
Invoke-WebRequest http://127.0.0.1:8080/readyz -UseBasicParsing
```

## 6. Desactivar el arranque automatico

Para deshabilitar la tarea sin borrarla:

```powershell
Disable-ScheduledTask -TaskName "X MCP FCBNews2026"
```

Para volver a habilitarla:

```powershell
Enable-ScheduledTask -TaskName "X MCP FCBNews2026"
```

Para borrarla:

```powershell
Unregister-ScheduledTask -TaskName "X MCP FCBNews2026" -Confirm:$false
```

## 7. Parar procesos arrancados automaticamente

Si se arrancaron con ventanas minimizadas, abrir cada ventana y pulsar:

```text
Ctrl+C
```

Si no se encuentran las ventanas, listar procesos relacionados:

```powershell
Get-Process node,powershell,tunnel-client -ErrorAction SilentlyContinue
```

Preferir cerrar las ventanas manualmente para no parar otros procesos de Node o
PowerShell que no pertenezcan al MCP.

## 8. Recomendaciones de operacion

- En desarrollo, usar `npm run dev:http`.
- En uso estable, ejecutar primero `npm run build` y despues `npm run start:http`.
- Mantener `X_MCP_MODE=read-only` si no se necesita publicar.
- Si se activa `read-write`, verificar siempre la cuenta con
  `x_get_active_account`.
- No cambiar `.env` mientras el servidor esta corriendo; cambiar y reiniciar.
- No arrancar dos MCPs en el mismo puerto.
- Mantener el ordenador encendido y con sesion iniciada si ChatGPT debe usar el
  MCP.

## 9. Checklist de disponibilidad

- [ ] Ordenador encendido.
- [ ] Sesion de Windows iniciada.
- [ ] `.env` configurado.
- [ ] Servidor MCP activo.
- [ ] Tunnel-client activo.
- [ ] `/healthz` devuelve `ok: true`.
- [ ] `/readyz` devuelve HTTP 200.
- [ ] ChatGPT tiene el MCP personalizado creado con `Conexion: Tunel`.
- [ ] Primera prueba de la sesion: `x_get_active_account`.
