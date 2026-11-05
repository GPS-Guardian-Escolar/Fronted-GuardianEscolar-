# Flujo Git del frontend

## Rama de integracion

La rama de integracion de este repositorio es `develop`. Las ramas de funcionalidad y correccion se integran mediante pull request hacia `develop`; no trabajes directamente sobre esa rama.

`qa` y `main` se usan solo cuando existan y esten habilitadas para el flujo de entrega de este repositorio. No se asume una rama `staging`. La rama principal y las reglas de promocion pueden diferir entre Backend, DB-Structure e Infra; verifica el destino de cada repositorio antes de abrir el PR.

## Crear una rama de trabajo

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/nombre-cambio
```

Usa prefijos claros como `feat/`, `fix/`, `docs/`, `chore/` o `ci/`. Mant?n cada PR centrado en un cambio y basado en el head remoto actualizado.

## Guardar y publicar

```bash
git status --short
git add <archivos>
git commit -m "tipo: resumen del cambio"
git push -u origin feat/nombre-cambio
```

Abre un PR `feat/nombre-cambio` hacia `develop`. Describe el comportamiento cambiado y la verificacion hecha. No mezcles cambios locales ajenos al PR.

## Actualizar la rama de trabajo

```bash
git fetch origin
git switch feat/nombre-cambio
git rebase origin/develop
```

Si el equipo requiere merge commits en vez de rebase, sigue esa regla del repositorio; no combines ambas estrategias dentro de la misma rama. Resuelve conflictos de forma explicita y revisa el diff antes de publicar.

## Entrega

Cuando el PR se integre, actualiza `develop` y elimina la rama remota si la politica del equipo lo permite. Promociona a `qa` o `main` solo mediante los PR y las verificaciones configuradas por el equipo.
