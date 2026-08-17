# Desarrollo

Guia para trabajar en el proyecto.

## Instalar

```powershell
npm install
```

## Ejecutar en desarrollo

Stdio:

```powershell
npm run dev
```

HTTP:

```powershell
npm run dev:http
```

## Build

```powershell
npm run build
```

## Typecheck

```powershell
npm run typecheck
```

## Tests

```powershell
npm test
```

## Estructura

```text
src/
  config.ts
  http.ts
  index.ts
  server.ts
  x/
    client.ts

scripts/
  x-oauth-authorize.ts

tests/
  config.test.ts
  x-client.test.ts

docs/
  chatgpt-mcp-setup.md
  configuration.md
  development.md
  project-architecture.md
  tools.md
  x-oauth.md
```

## Anadir una herramienta MCP

1. Definir si es lectura o escritura.
2. Anadir el metodo necesario en `src/x/client.ts` si hace falta.
3. Registrar la herramienta en `src/server.ts`.
4. Validar input con Zod.
5. Marcar `annotations.readOnlyHint`.
6. Si escribe, llamar a `assertWriteEnabled(config)` antes de la API externa.
7. Devolver salida con `asToolResult`.
8. Capturar errores con `asToolError`.
9. Anadir o actualizar tests.
10. Documentar la herramienta en `docs/tools.md`.

## Convenciones de herramientas

- Prefijo `x_` para herramientas de X.
- Inputs pequenos y explicitos.
- No esconder publicaciones dentro de herramientas de lectura.
- No mezclar varias acciones remotas en una sola herramienta si pueden fallar de
  forma independiente.
- La herramienta debe devolver la respuesta del servicio final, incluyendo IDs.

## Seguridad en cambios de escritura

Toda herramienta que modifique estado externo debe:

- Requerir `X_MCP_MODE=read-write`.
- Tener descripcion clara.
- Usar `readOnlyHint: false`.
- No publicar contenido generado internamente sin input explicito.
- Devolver el ID de la accion creada o modificada.

## Variables de entorno en tests

Los tests deben pasar sin tokens reales.

Usar mocks o variables ficticias. No depender de la API real de X en pruebas
unitarias.

## Checklist antes de abrir PR

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `.env.example` actualizado si hay variables nuevas.
- [ ] README actualizado si cambia el uso principal.
- [ ] Documentos en `docs/` actualizados si cambia arquitectura, OAuth,
      herramientas o ChatGPT.
- [ ] No hay secretos en el diff.
