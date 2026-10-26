# 🚀 Flujo Git Profesional
## Estrategia: DEV, QA, STAGING y MAIN

> **🎯 Regla de Oro:**
> *El código sube: `dev` → `main`*
> *Los errores bajan: `main` → `dev`*

Este documento define el estándar estricto de control de versiones para el proyecto Guardian Escolar. Garantiza que el código pase por todos los filtros de calidad antes de llegar a producción y que cualquier error sea corregido en todos los entornos inferiores.

---

## 🧠 Conceptos Generales

### Jerarquía de Ramas Principales
El código debe viajar estrictamente en este orden:
`dev` ➔ `qa` ➔ `staging` ➔ `main`

### Nomenclatura de Ramas de Trabajo
Nunca se trabaja directamente en las ramas principales. Siempre se debe crear una rama temporal:
* **`HU/nombre-historia`** → Nuevas funcionalidades (Historias de Usuario). Salen de `dev`.
* **`fix/nombre-error`** → Corrección de errores encontrados en `qa` o `staging`.
* **`hotfix/nombre-error`** → Corrección de errores críticos encontrados en producción (`main`).

---

## ✅ ESCENARIO 1: Camino Feliz (Sin Errores)

Cuando una funcionalidad se desarrolla y pasa todas las pruebas sin problemas.

### 1. Desarrollo (HU)
```bash
git checkout dev
git pull origin dev
git checkout -b HU-01-login
git add .
git commit -m "HU-01 login"
git push origin HU-01-login
```
👉 **PR (Pull Request):** `HU-01-login` → `dev`
*(Tras aprobarse, volvemos a dev y bajamos los cambios)*
```bash
git checkout dev
git pull origin dev
```

### 2. Pase a QA
👉 **PR:** `dev` → `qa`
```bash
git checkout qa
git pull origin qa
```

### 3. Pase a Staging
👉 **PR:** `qa` → `staging`
```bash
git checkout staging
git pull origin staging
```

### 4. Pase a Producción
👉 **PR:** `staging` → `main`
```bash
git checkout main
git pull origin main
```

---

## 🔥 ESCENARIO 2: Flujo con Errores (Fixes y Hotfixes)

Aquí aplicamos la regla de que **"Los errores bajan"**. Si un error se arregla en QA, ese arreglo también debe llevarse a DEV para que no vuelva a ocurrir.

### A. Error detectado en QA
```bash
git checkout qa
git pull origin qa
git checkout -b fix/error-login
# ... hacer los cambios ...
git add .
git commit -m "fix login QA"
git push origin fix/error-login
```
👉 **Crear PRs en cascada (bajar el error):**
1. `fix/error-login` → `qa`
2. `fix/error-login` → `dev`

*(Actualizar locales)*
```bash
git checkout qa && git pull origin qa
git checkout dev && git pull origin dev
```

### B. Error detectado en STAGING
```bash
git checkout staging
git pull origin staging
git checkout -b fix/error-staging
# ... hacer los cambios ...
git add .
git commit -m "fix staging"
git push origin fix/error-staging
```
👉 **Crear PRs en cascada (bajar el error):**
1. `fix/error-staging` → `staging`
2. `fix/error-staging` → `qa`
3. `fix/error-staging` → `dev`

*(Actualizar locales)*
```bash
git checkout staging && git pull origin staging
git checkout qa && git pull origin qa
git checkout dev && git pull origin dev
```

### C. Error detectado en PRODUCCIÓN (MAIN)
```bash
git checkout main
git pull origin main
git checkout -b hotfix/error-critico
# ... hacer los cambios ...
git add .
git commit -m "hotfix produccion"
git push origin hotfix/error-critico
```
👉 **Crear PRs en cascada (bajar el error):**
1. `hotfix/error-critico` → `main`
2. `hotfix/error-critico` → `staging`
3. `hotfix/error-critico` → `qa`
4. `hotfix/error-critico` → `dev`

*(Actualizar locales en todas las ramas)*

---

## 🧠 Resumen del Movimiento

**Flujo normal (Hacia arriba):**
`HU` → `dev` → `qa` → `staging` → `main`

**Flujo de arreglos (Hacia abajo):**
* Error en **QA** → `fix` va a: `qa` + `dev`
* Error en **STAGING** → `fix` va a: `staging` + `qa` + `dev`
* Error en **MAIN** → `hotfix` va a: `main` + `staging` + `qa` + `dev`

---

## ⚠️ Claves Importantes y Errores Comunes

### Buenas Prácticas ✔
- **Siempre** usar PR (Pull Request) en la plataforma (GitHub/GitLab/Bitbucket), nunca hacer merges locales para ramas principales.
- **Siempre** hacer `git pull` después de que un PR se haya aprobado e integrado.
- **Nunca** trabajar directamente en las ramas `dev`, `qa`, `staging` o `main`.
- Mantener las ramas limpias: borrar las ramas `HU/` o `fix/` una vez sus PRs sean aprobados.

### Errores Comunes que Rompen el Repositorio ❌
- ❌ **Crear sub-ramas incorrectas:** (ej: crear `qa-hija` o `main-hija`). Las ramas de trabajo solo son `HU/`, `fix/` o `hotfix/`.
- ❌ **No hacer pull:** Empezar a programar teniendo la rama local desactualizada.
- ❌ **No bajar los fixes a dev:** Si arreglas un error en QA pero no llevas el arreglo a DEV, cuando DEV vuelva a subir a QA, el error reaparecerá.
