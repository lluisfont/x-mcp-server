# Herramientas MCP

Este servidor expone herramientas pequenas y atomicas. El agente que llama debe
encargarse de la logica editorial, aprobaciones, deduplicacion y decisiones de
publicacion.

## Lectura

### `x_get_active_account`

Devuelve:

- Perfil local activo.
- Cuentas configuradas.
- Modo actual.
- Usuario autenticado en X.

Uso recomendado:

- Primera prueba tras conectar el MCP.
- Comprobacion antes de publicar.
- Diagnostico de seleccion multicuentas.

### `x_get_me`

Devuelve el usuario autenticado.

Uso recomendado:

- Verificar que el token pertenece a la cuenta esperada.

### `x_get_user`

Input:

```json
{
  "username": "FCBNews2026"
}
```

Devuelve informacion publica del usuario.

### `x_get_post`

Input:

```json
{
  "postId": "1234567890"
}
```

Devuelve un post por ID.

### `x_get_user_posts`

Input:

```json
{
  "userId": "1234567890",
  "maxResults": 10
}
```

`maxResults` debe estar entre 5 y 100.

### `x_search_posts`

Input:

```json
{
  "query": "from:FCBNews2026",
  "maxResults": 10
}
```

Usa la sintaxis oficial de busqueda reciente de X.

`maxResults` debe estar entre 10 y 100.

## Escritura

Las herramientas de escritura estan bloqueadas salvo que:

```env
X_MCP_MODE=read-write
```

El token tambien debe tener scope:

```text
tweet.write
```

### `x_create_post`

Input:

```json
{
  "text": "Texto exacto a publicar"
}
```

Uso recomendado:

- Publicar solo texto exacto aprobado.
- Pedir siempre que devuelva el ID generado.

Prompt recomendado:

```text
Publica exactamente este texto con x_create_post:
"Texto aprobado."
Devuelveme el post_id.
```

### `x_reply_post`

Input:

```json
{
  "postId": "1234567890",
  "text": "Texto exacto de la respuesta"
}
```

Uso recomendado:

- Confirmar el post destino antes de responder.
- Publicar solo texto exacto aprobado.

## Orden recomendado de pruebas

1. `x_get_active_account`
2. `x_get_me`
3. Una busqueda de lectura con `x_search_posts`
4. Si todo es correcto, activar `read-write`
5. `x_create_post` con texto tecnico controlado
6. Guardar el `post_id` devuelto

## Criterios antes de publicar

- La cuenta activa es correcta.
- El texto exacto esta aprobado.
- El MCP esta en `read-write`.
- El token tiene permisos de escritura.
- El agente sabe que debe devolver el ID.
- No hay automatismos que publiquen sin confirmacion.
