/**
 * CONFIGURACIÓN DE TENANT — MÍTICO FITNESS
 *
 * Este archivo es el único artefacto que define cómo se ve y qué dice el sitio
 * de Mítico Fitness. No existe ningún componente, ruta ni hoja de estilo
 * específica de este cliente.
 *
 * Paleta oficial (manual de marca):
 *   Neón Eléctrico    #39FF14  — acción, foco, énfasis
 *   Negro Carbón      #1A1C1E  — superficie de tarjeta
 *   Verde Estructural #38761D  — bloques y tarjetas de servicio
 *   Verde de Barra    #1E5128  — barras de título y controles superiores
 *   Blanco / Gris     #FFFFFF / #C1C1C1 — texto y detalles sutiles
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ORIGEN DE LOS DATOS
 *
 * Precios, paquetes, productos, redes y WhatsApp provienen del material
 * comercial de la empresa (`informacion_empresa.md`). Es información real.
 *
 * PENDIENTE DE CONFIRMAR POR ESCRITO CON EL CLIENTE — hoy son valores de
 * relleno heredados de la demo y NO deben publicarse como definitivos:
 *   · contact.email
 *   · contact.addressLine
 *   · hours.week / holidayNote  (por eso `showSchedule` está apagada)
 *   · contact.mapEmbedUrl       (por eso `showLocationMap` está apagada)
 *   · enlace del grupo de WhatsApp (el material lo lista sin URL)
 *
 * Las secciones sin información real —galería, instalaciones, equipo,
 * testimonios— están apagadas por flag, lo que además hace que sus rutas
 * respondan 404. No se dejan encendidas con contenido inventado.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { DEFAULT_FEATURE_FLAGS } from '@core/domain/tenant/feature-flags';

export const miticoTenant: TenantConfig = {
  slug: 'mitico',
  name: 'Mítico Fitness',
  legalName: 'Mítico Fitness S.R.L.',
  tagline: 'El dolor que sentirás hoy es la fuerza que sentirás mañana',

  domains: ['miticofitness.com', 'www.miticofitness.com'],

  branding: {
    mode: 'dark',
    logo: {
      wordmark: 'Mítico',
      subMark: 'Fitness',
      monogram: 'M',
    },
    palette: {
      primary: '#39FF14',
      primaryStrong: '#2BD40D',
      structural: '#38761D',
      structuralDeep: '#1E5128',
      surface: '#0C0E0F',
      surfaceRaised: '#131617',
      surfaceCard: '#1A1C1E',
      text: '#FFFFFF',
      textMuted: '#9BA49B',
      border: '#252A26',
      accent: '#C1C1C1',
    },
    typography: {
      display: 'var(--font-display-condensed), "Arial Narrow", sans-serif',
      body: 'var(--font-body-sans), system-ui, sans-serif',
      scale: 'editorial',
      uppercaseHeadings: true,
      headingTracking: '0.02em',
    },
    shape: {
      corners: 'soft',
      surfaceStyle: 'glass',
      glowIntensity: 1,
      showGrid: true,
    },
  },

  contact: {
    phone: '+591 77700867',
    whatsapp: '59177700867',
    whatsappMessage:
      'Hola Mítico Fitness 👋 Quiero información sobre los paquetes y precios.',
    // PENDIENTE: confirmar con el cliente.
    email: 'hola@miticofitness.com',
    addressLine: 'Av. Banzer 3er Anillo, Calle Los Cusis #240',
    city: 'Santa Cruz de la Sierra',
    country: 'Bolivia',
    mapEmbedUrl: '',
    mapLinkUrl: '',
  },

  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100067354614799',
    instagram: 'https://www.instagram.com/mitico_fit/',
    tiktok: 'https://www.tiktok.com/@mitico_fitness',
    youtube: 'https://www.youtube.com/@miticofitness',
  },

  // PENDIENTE: horarios reales. `showSchedule` está apagada hasta confirmarlos.
  hours: {
    timezone: 'America/La_Paz',
    week: [
      { day: 'Lunes', open: '05:30', close: '23:00', closed: false },
      { day: 'Martes', open: '05:30', close: '23:00', closed: false },
      { day: 'Miércoles', open: '05:30', close: '23:00', closed: false },
      { day: 'Jueves', open: '05:30', close: '23:00', closed: false },
      { day: 'Viernes', open: '05:30', close: '23:00', closed: false },
      { day: 'Sábado', open: '07:00', close: '20:00', closed: false },
      { day: 'Domingo', open: '08:00', close: '14:00', closed: false },
    ],
  },

  /**
   * Menú de cuatro entradas tomado del material comercial de la empresa.
   *
   * Las etiquetas son las que usa el gimnasio; los segmentos son las rutas del
   * producto. Que no coincidan es exactamente la razón por la que la
   * navegación es dato y no código: otro cliente nombra las mismas rutas de
   * otra forma sin que se toque un archivo de la aplicación.
   */
  navigation: [
    { label: 'Mítico', segment: '' },
    { label: 'Rutina', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Ejercicio', segment: 'servicios' },
    { label: 'Información', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,
    showProducts: true,
    // Sin material real todavía: apagadas, y sus rutas responden 404.
    showGallery: false,
    showFacilities: false,
    showSchedule: false,
    showTeam: false,
    showTestimonials: false,
    showLocationMap: false,
  },

  seo: {
    title: 'Mítico Fitness — El dolor que sentirás hoy es la fuerza que sentirás mañana',
    titleTemplate: '%s | Mítico Fitness',
    description:
      'Gimnasio en Santa Cruz de la Sierra. Paquetes mensuales desde 160 Bs, entrenamiento personalizado con rutinas temáticas, baile fitness, nutricionista y suplementación deportiva.',
    keywords: [
      'gimnasio santa cruz',
      'mítico fitness',
      'entrenamiento personalizado',
      'suplementos deportivos',
      'baile fitness',
      'paquetes de gimnasio',
    ],
    locale: 'es_BO',
  },

  provisioning: {
    plan: 'professional',
    activeSince: '2026-01-15',
    status: 'active',
  },

  content: {
    hero: {
      eyebrow: 'Santa Cruz de la Sierra',
      title: 'Vamos con',
      titleAccent: 'todo',
      subtitle:
        'El dolor que sentirás hoy es la fuerza que sentirás mañana. Entrenamiento personalizado, baile fitness, nutrición y suplementación en un solo lugar.',
      primaryCta: { label: 'Ver paquetes', segment: 'planes' },
      secondaryCta: { label: 'Hablar por WhatsApp', segment: 'contacto' },
      stats: [
        { value: '17', label: 'paquetes disponibles' },
        { value: '25', label: 'Bs desde, por sesión' },
        { value: '10', label: 'rutinas con nombre propio' },
        { value: '4', label: 'planes personalizados' },
      ],
    },

    about: {
      eyebrow: 'Mítico',
      title: 'Descubrí el héroe que vive en vos',
      lead:
        'Mítico Fitness es un gimnasio de Santa Cruz de la Sierra donde el entrenamiento se arma alrededor de la persona, no al revés.',
      paragraphs: [
        'Nuestros paquetes cubren desde la sesión suelta hasta el plan anual, con opciones que suman baile fitness, nutricionista profesional o entrenador personal según lo que cada uno necesite. Podés empezar por un día y decidir después.',
        'El entrenamiento personalizado se organiza en rutinas con nombre propio —Batman, Gamora, Thor, Hulk, Capitana Marvel— que marcan el nivel y el enfoque de cada programa. No es decoración: cada rutina tiene una progresión distinta y un objetivo distinto.',
        'Además del entrenamiento, en el mostrador encontrás la suplementación y los accesorios que usamos y recomendamos: proteína, creatina, pre-entrenos, shakers y ropa deportiva de la casa.',
      ],
      values: [
        {
          title: 'Entrenamiento personalizado',
          description:
            'Seguimiento individual y rutina asignada según tu nivel, incluido en todos los paquetes.',
          icon: 'trainer',
        },
        {
          title: 'Nutrición profesional',
          description:
            'Nutricionista disponible en los paquetes Fit, Mítico y en el plan personalizado Premium.',
          icon: 'nutrition',
        },
        {
          title: 'Baile fitness',
          description:
            'Bachata, twerking y dance como parte del entrenamiento en los paquetes Dance.',
          icon: 'group',
        },
        {
          title: 'Suplementación',
          description:
            'Proteína, creatina, pre-entrenos y aminoácidos disponibles en el gimnasio.',
          icon: 'sparkle',
        },
      ],
      milestones: [],
    },

    services: [
      {
        id: 'entrenamiento-personalizado',
        name: 'Entrenamiento personalizado',
        summary: 'Descubrí el héroe que vive en vos.',
        description:
          'Cuatro planes con entrenador y seguimiento individual, cada uno con sus rutinas asignadas. Incluyen pre-entreno y batido semanal, y el plan Premium suma nutricionista profesional.',
        icon: 'trainer',
        highlights: ['Desde 220 Bs al mes', 'Rutinas con nombre propio', 'Seguimiento personal'],
      },
      {
        id: 'acceso-gimnasio',
        name: 'Acceso al gimnasio',
        summary: 'Acceso completo a todas las máquinas, con horario flexible.',
        description:
          'Todos los paquetes mensuales incluyen acceso completo al gimnasio, horario flexible y uso de todas las máquinas, además del entrenamiento personalizado.',
        icon: 'dumbbell',
        highlights: ['Horario flexible', 'Todas las máquinas', 'Desde 160 Bs al mes'],
      },
      {
        id: 'baile-fitness',
        name: 'Baile fitness',
        summary: 'Bachata, twerking y dance como parte del entrenamiento.',
        description:
          'Disponible en los paquetes Fit Dance, Básico Dance, Mítico Fitness y Mítico Dance. Entrenás y bailás dentro de la misma membresía, sin pagar aparte.',
        icon: 'group',
        highlights: ['Bachata y twerking', 'Incluido en paquetes Dance', 'Sin costo adicional'],
      },
      {
        id: 'nutricion',
        name: 'Asesoría nutricional',
        summary: 'Nutricionista profesional dentro del gimnasio.',
        description:
          'Incluida en los paquetes Básico Fit, Mítico y Mítico Dance, y en el plan de entrenamiento personalizado Premium. El plan alimentario acompaña al entrenamiento, no lo contradice.',
        icon: 'nutrition',
        highlights: ['Nutricionista profesional', 'Incluida en varios paquetes', 'Seguimiento continuo'],
      },
      {
        id: 'suplementacion',
        name: 'Suplementación y productos',
        summary: 'Proteínas, pre-entrenos, aminoácidos y accesorios.',
        description:
          'Venta en el mostrador del gimnasio: proteína, creatina, pre-entrenos, hidratación y accesorios como shakers y tomatodos, además de la ropa deportiva de la casa.',
        icon: 'sparkle',
        highlights: ['Proteína y creatina', 'Pre-entrenos', 'Shakers y ropa deportiva'],
      },
    ],

    planGroups: [
      {
        id: 'paquetes-basicos',
        name: 'Paquetes básicos',
        description: 'Lo esencial para entrenar: acceso completo y entrenamiento personalizado.',
        plans: [
          {
            id: 'mensual-basico',
            name: 'Paquete Mensual Básico',
            tagline: 'El punto de partida',
            price: 160,
            currency: 'Bs',
            period: 'mensual',
            featured: true,
            badge: 'Más popular',
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Nutricionista profesional', included: false },
              { label: 'Batido semanal', included: false },
              { label: 'Baile fitness', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'quincenal',
            name: 'Paquete 15 días',
            tagline: 'Para probar sin comprometerte al mes',
            price: 110,
            currency: 'Bs',
            period: 'quincenal',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio por 15 días', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Nutricionista profesional', included: false },
              { label: 'Batido semanal', included: false },
              { label: 'Baile fitness', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-fit',
            name: 'Paquete Básico Fit',
            tagline: 'Con nutricionista profesional',
            price: 260,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Nutricionista profesional', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Batido semanal', included: false },
              { label: 'Baile fitness', included: false },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'paquetes-fit',
        name: 'Paquetes Fit',
        description: 'Suman batido semanal y baile fitness al entrenamiento.',
        plans: [
          {
            id: 'fit',
            name: 'Paquete Fit',
            tagline: 'Entrenamiento con batido semanal',
            price: 180,
            currency: 'Bs',
            period: 'mensual',
            featured: true,
            badge: 'Más popular',
            features: [
              { label: 'Batido semanal', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Baile fitness', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'fit-dance',
            name: 'Paquete Fit Dance',
            tagline: 'Batido semanal y baile fitness',
            price: 280,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Batido semanal', included: true },
              { label: 'Baile fitness', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-dance',
            name: 'Paquete Básico Dance',
            tagline: 'Baile fitness sin batido',
            price: 250,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Baile fitness', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Batido semanal', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'paquetes-mitico',
        name: 'Paquetes Mítico',
        description: 'La oferta completa: nutrición, baile y batido en la misma membresía.',
        plans: [
          {
            id: 'mitico',
            name: 'Mítico',
            tagline: 'Nutrición y batido semanal',
            price: 280,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Batido semanal', included: true },
              { label: 'Nutricionista profesional', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Baile fitness', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'mitico-fitness',
            name: 'Mítico Fitness',
            tagline: 'Bachata y twerking incluidos',
            price: 300,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Bachata', included: true },
              { label: 'Twerking', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'mitico-dance',
            name: 'Mítico Dance',
            tagline: 'Todo incluido',
            price: 380,
            currency: 'Bs',
            period: 'mensual',
            featured: true,
            badge: 'Más popular',
            features: [
              { label: 'Baile fitness', included: true },
              { label: 'Batido semanal', included: true },
              { label: 'Nutricionista profesional', included: true },
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'entrenamiento-personalizado',
        name: 'Entrenamiento personalizado',
        description: 'Descubrí el héroe que vive en vos. Cada plan trae sus rutinas asignadas.',
        plans: [
          {
            id: 'personalizado-basico',
            name: 'Plan Básico',
            tagline: 'Entrenamiento con seguimiento personal',
            price: 220,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Seguimiento personal', included: true },
              { label: '1 pre-entreno', included: true },
              { label: '1 batido semanal', included: true },
              { label: 'Entrenador personal dedicado', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
            routines: ['Rutina Batman', 'Rutina Gamora'],
          },
          {
            id: 'personalizado-intermedio',
            name: 'Plan Intermedio',
            tagline: 'Doble pre-entreno',
            price: 350,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: '2 pre-entrenos', included: true },
              { label: '1 batido semanal', included: true },
              { label: 'Entrenador personal dedicado', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
            routines: ['Rutina Capitán América', 'Rutina Capitana Marvel'],
          },
          {
            id: 'personalizado-avanzado',
            name: 'Plan Avanzado',
            tagline: 'Con entrenador personal',
            price: 400,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Entrenador personal', included: true },
              { label: '2 pre-entrenos semanales', included: true },
              { label: '1 batido semanal', included: true },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
            routines: ['Rutina Thor', 'Rutina Fénix'],
          },
          {
            id: 'personalizado-premium',
            name: 'Plan Premium',
            tagline: 'Entrenador y nutricionista',
            price: 480,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            badge: 'Completo',
            features: [
              { label: 'Entrenador personal', included: true },
              { label: '2 pre-entrenos semanales', included: true },
              { label: '1 batido semanal', included: true },
              { label: 'Nutricionista profesional', included: true },
            ],
            ctaLabel: 'Consultar',
            routines: ['Rutina Hulk', 'Rutina Mujer Maravilla'],
          },
        ],
      },
      {
        id: 'paquetes-especiales',
        name: 'Paquetes especiales',
        description: 'Sesión suelta y planes extendidos, para quien prefiere pagar por adelantado.',
        plans: [
          {
            id: 'sesion-individual',
            name: 'Sesión Individual',
            tagline: 'Un día, sin compromiso',
            price: 25,
            currency: 'Bs',
            period: 'diario',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'trimestral',
            name: 'Plan Trimestral',
            tagline: 'Tres meses por adelantado',
            price: 400,
            currency: 'Bs',
            period: 'trimestral',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'semestral',
            name: 'Plan Semestral',
            tagline: 'Seis meses por adelantado',
            price: 800,
            currency: 'Bs',
            period: 'semestral',
            featured: false,
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'anual',
            name: 'Plan Anual',
            tagline: 'El año completo',
            price: 1500,
            currency: 'Bs',
            period: 'anual',
            featured: false,
            badge: 'Mejor valor',
            features: [
              { label: 'Entrenamiento personalizado', included: true },
              { label: 'Acceso completo al gimnasio', included: true },
              { label: 'Horario flexible', included: true },
              { label: 'Acceso a todas las máquinas', included: true },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
    ],
    plansNote:
      'Todos los precios están en bolivianos. Podés pagar por QR o consultarnos por WhatsApp: te ayudamos a elegir el paquete que mejor se adapta a tus objetivos.',

    products: [
      {
        id: 'indumentaria',
        name: 'Poleras y ropa deportiva',
        description: 'Indumentaria de la casa, con diseño propio.',
        icon: 'sparkle',
        items: [
          { id: 'polera-blanca', name: 'Polera blanca con diseño', price: 35, currency: 'Bs' },
          {
            id: 'polera-negra',
            name: 'Polera negra con diseño',
            price: 40,
            currency: 'Bs',
            badge: 'Más popular',
          },
        ],
      },
      {
        id: 'suplementos',
        name: 'Suplementos deportivos',
        description:
          'Proteínas, pre-entrenos, aminoácidos y más para potenciar tus resultados.',
        icon: 'nutrition',
        items: [
          { id: 'atp-force', name: 'ATP Force', price: 250, currency: 'Bs' },
          { id: 'fema-trope', name: 'Fema Trope', price: 290, currency: 'Bs' },
          { id: 'dry-up', name: 'Dry Up', price: 290, currency: 'Bs' },
          { id: 'hydra', name: 'Hydra', price: 300, currency: 'Bs' },
          {
            id: 'pre-entreno-venom',
            name: 'Pre-entreno Venom',
            price: 350,
            currency: 'Bs',
            badge: 'Más popular',
          },
          { id: 'creatina', name: 'Creatina', price: 370, currency: 'Bs' },
          {
            id: 'proteina',
            name: 'Proteína',
            price: 460,
            currency: 'Bs',
            badge: 'Más popular',
          },
        ],
      },
      {
        id: 'accesorios',
        name: 'Accesorios de entrenamiento',
        description: 'Equipo y accesorios para mejorar tu entrenamiento y estilo.',
        icon: 'dumbbell',
        items: [
          { id: 'tomatodo-pequeno', name: 'Tomatodo pequeño', price: 50, currency: 'Bs' },
          { id: 'tomatodo-grande', name: 'Tomatodo grande', price: 70, currency: 'Bs' },
          { id: 'shaker', name: 'Shaker', price: 120, currency: 'Bs' },
        ],
      },
    ],

    // Sin material fotográfico ni datos verificados todavía. Las flags
    // correspondientes están apagadas y las rutas responden 404.
    facilities: [],
    gallery: [],
    team: [],
    testimonials: [],

    faq: [
      {
        id: 'empezar',
        question: '¿Cuánto cuesta empezar?',
        answer:
          'La sesión individual cuesta 25 Bs y te da acceso completo al gimnasio por un día. Si preferís el mes, el Paquete Mensual Básico está en 160 Bs e incluye entrenamiento personalizado, horario flexible y acceso a todas las máquinas.',
      },
      {
        id: 'pago',
        question: '¿Cómo puedo pagar?',
        answer:
          'Podés pagar por QR. Si tenés dudas sobre qué paquete te conviene, escribinos por WhatsApp al 77700867 y te asesoramos antes de que pagues.',
      },
      {
        id: 'personalizado',
        question: '¿Qué incluye el entrenamiento personalizado?',
        answer:
          'Hay cuatro planes, de 220 a 480 Bs al mes. Todos incluyen entrenamiento personalizado, pre-entreno y un batido semanal. Del Avanzado en adelante sumás entrenador personal, y el Premium incluye además nutricionista profesional.',
      },
      {
        id: 'rutinas',
        question: '¿Qué son las rutinas con nombre de superhéroe?',
        answer:
          'Cada plan de entrenamiento personalizado trae dos rutinas asignadas —Batman y Gamora en el Básico, Hulk y Mujer Maravilla en el Premium, entre otras—. El nombre marca el nivel y el enfoque del programa que vas a seguir.',
      },
      {
        id: 'baile',
        question: '¿Hay clases de baile?',
        answer:
          'Sí. Los paquetes Fit Dance, Básico Dance y Mítico Dance incluyen baile fitness, y el paquete Mítico Fitness incluye bachata y twerking. No se pagan aparte: van dentro de la membresía.',
      },
      {
        id: 'suplementos',
        question: '¿Venden suplementos y productos?',
        answer:
          'Sí, en el mostrador del gimnasio. Tenemos proteína, creatina, pre-entrenos, hidratación, shakers, tomatodos y las poleras de la casa. Consultanos por WhatsApp y te decimos qué hay disponible.',
      },
    ],

    closingCta: {
      title: '¡Vamos con todo!',
      subtitle:
        'El dolor que sentirás hoy es la fuerza que sentirás mañana. Escribinos y armamos tu plan.',
      label: 'Consultar por WhatsApp',
    },
  },
};
