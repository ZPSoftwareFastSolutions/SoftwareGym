# ADR 0003 — La configuración del gimnasio es un dato, no código

**Estado:** Aceptada · **Fecha:** 2026-09-08 · **Ámbito:** V1 → V4

## Contexto

Un producto enlatado se degrada de la forma más previsible: llega un cliente que
pide "solo un detalle" distinto, se añade un condicional por su nombre, y seis
clientes después el código está lleno de `if (tenant === 'mitico')`. A partir de
ahí ya no hay un producto: hay N proyectos compartiendo carpeta.

## Decisión

Toda diferencia entre gimnasios se expresa en `TenantConfig`. **Ningún archivo
de aplicación puede contener el nombre ni el slug de un cliente concreto.**

Prueba de aceptación:

> Dar de alta un gimnasio son dos pasos: crear su archivo de configuración y
> registrarlo. Si hiciera falta tocar un componente, una ruta, una hoja de
> estilo o una consulta, el producto habría dejado de ser enlatado.

## Cómo se sostiene

| Diferencia | Mecanismo |
|---|---|
| Colores, tipografía, forma | `branding` → tokens CSS derivados |
| Qué secciones existen | `features` (feature flags) |
| Etiquetas y orden del menú | `navigation` |
| Textos, planes, servicios | `content` |
| Contacto, horarios, redes | `contact`, `hours`, `social` |
| Metadatos de búsqueda | `seo` |

Los componentes consumen **tokens semánticos** (`bg-surface`, `text-action`),
nunca un color de marca. Por eso el mismo `PlanCard` se ve Mítico o Aurora sin
saber que existe ninguno de los dos.

## Consecuencias

**A favor**
- Alta de cliente sin desarrollo.
- Migración a configuración en base de datos (V1.5) sin cambiar el contrato.
- Una petición imposible de satisfacer con configuración es una señal temprana:
  o se extiende el contrato para todos, o el cliente no encaja en el producto.

**En contra**
- El contrato es grande y crece. Se acepta: la alternativa es peor.
- Una necesidad genuinamente única obliga a extender `TenantConfig` para todos.
  Es deliberado: fuerza a decidir si la capacidad pertenece al producto.

## Verificación

Ningún slug de cliente puede aparecer en una línea de código ejecutable. Solo
se admite dentro de comentarios, como ejemplo ilustrativo.

```bash
grep -rn "mitico\|aurora-fit" apps/web/src --include=*.ts --include=*.tsx   | grep -v "tenant.registry"   | grep -vE ':\s*(\*|//|/\*)'
```

Salida vacía = la regla se cumple. Hoy se cumple: las tres coincidencias que
existen están en comentarios de `tenant-config.ts`, `page-guards.ts` y
`tenant-links.ts`.

Cuando exista CI, esta comprobación debe fallar el build.
