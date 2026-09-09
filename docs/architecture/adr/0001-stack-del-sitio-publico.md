# ADR 0001 — Stack del sitio público

**Estado:** Aceptada · **Fecha:** 2026-09-08 · **Ámbito:** V1

## Contexto

El plan original proponía .NET en el backend y React en el frontend. Para V1 el
alcance es únicamente el sitio público: sin autenticación, sin base de datos,
sin sistema de gestión. El requisito operativo era poder desplegarlo rápido, a
bajo coste, para mostrarlo a clientes y a la familia.

Se evaluó también Blazor, por coherencia con el backend previsto.

## Decisión

**Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**, prerenderizado
estático, desplegado en Vercel.

## Motivos

1. **El contenido es estático.** Un sitio público configurable no necesita
   servidor: se prerenderiza una copia por gimnasio y la sirve la CDN.
2. **Coste operativo cero** en el plan gratuito de Vercel. Blazor Server exige
   un proceso vivo con WebSocket por visitante; Blazor WASM arrastra el runtime
   .NET al navegador, lo que penaliza el LCP en móvil de gama media —el
   dispositivo real de la mayoría de los visitantes de un gimnasio.
3. **Server Components** permiten que la resolución del tenant, el filtrado por
   feature flags y la generación del tema ocurran en el servidor, sin enviar
   JavaScript. El bundle inicial quedó en 106 kB.
4. **Ecosistema de SEO** maduro: metadatos por tenant, `sitemap.xml` y
   `robots.txt` generados desde el dominio.

## Consecuencias

**A favor**
- Despliegue en minutos, sin infraestructura que administrar.
- Sitios servidos desde CDN; TTFB de archivo estático.
- La API .NET puede sumarse después sin tocar el sitio público.

**En contra**
- Dos ecosistemas en el repositorio (Node y .NET). Se asume: el equipo trabaja
  en ambos y cada uno hace lo que hace bien.
- El sitio público no comparte modelo de dominio con el backend. Se mitiga
  manteniendo `TenantConfig` como contrato explícito y versionado.

## Alternativas descartadas

| Opción | Motivo |
|---|---|
| Blazor Server | Proceso vivo por visitante; coste y latencia sin beneficio |
| Blazor WASM | Runtime .NET al navegador; LCP pobre en móvil |
| ASP.NET MVC + Razor | Requiere servidor permanente para contenido estático |
| Astro | Excelente ajuste, pero menos ecosistema para el portal del socio de V3 |
