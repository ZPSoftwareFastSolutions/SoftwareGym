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
 * REAL (material comercial de la empresa): paquetes y precios, programas de
 * entrenamiento personalizado, productos, redes sociales, WhatsApp, slogan y
 * llamada a la acción.
 *
 * PENDIENTE DE CONFIRMAR POR ESCRITO CON EL CLIENTE — siguen siendo valores
 * heredados de la demostración y no deben tomarse como definitivos:
 *   · contact.email y la dirección exacta (contact.addressLine dice solo la ciudad)
 *   · hours.week / holidayNote
 *   · content.about (relato, valores e hitos)
 *   · content.facilities, content.gallery, content.team, content.testimonials
 *   · content.hero.stats
 *   · enlace del grupo de WhatsApp (el material lo lista sin URL)
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
    addressLine: 'La Paz, Bolivia',
    city: 'La Paz',
    country: 'Bolivia',
    // Mapa oficial del local. El recuadro se atenúa por CSS cuando el
    // tenant es de tema oscuro: Google no sirve una variante oscura del
    // embed, y un rectángulo blanco sobre fondo carbón parte la página.
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d927.4326416674123!2d-68.13122116825956!3d-16.503825761222917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f210016025b69%3A0x484d1d8a96c0313f!2sM%C3%ADtico%20Fitness!5e1!3m2!1ses-419!2sbo!4v1788959383433!5m2!1ses-419!2sbo',
    mapLinkUrl: 'https://maps.app.goo.gl/?q=M%C3%ADtico+Fitness+La+Paz',
  },

  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100067354614799',
    instagram: 'https://www.instagram.com/mitico_fit/',
    tiktok: 'https://www.tiktok.com/@mitico_fitness',
    youtube: 'https://www.youtube.com/@miticofitness',
  },

  // PENDIENTE: confirmar los horarios reales con el cliente.
  hours: {
    timezone: 'America/La_Paz',
    week: [
      { day: 'Lunes', open: '05:30', close: '23:00', closed: false },
      { day: 'Martes', open: '05:30', close: '23:00', closed: false },
      { day: 'Miércoles', open: '05:30', close: '23:00', closed: false },
      { day: 'Jueves', open: '05:30', close: '23:00', closed: false },
      { day: 'Viernes', open: '05:30', close: '23:00', closed: false },
      { day: 'Sábado', open: '07:00', close: '20:00', closed: false, note: 'Horario continuo' },
      { day: 'Domingo', open: '08:00', close: '14:00', closed: false, note: 'Solo sala de pesas' },
    ],
    holidayNote: 'Feriados nacionales: 08:00 a 13:00. Se anuncia por redes con 48 h de aviso.',
  },

  /**
   * Las etiquetas son dato del tenant; los segmentos son las rutas del
   * producto. Otro gimnasio nombra las mismas rutas de otra forma sin que se
   * toque un archivo de la aplicación.
   */
  navigation: [
    { label: 'Inicio', segment: '' },
    { label: 'Nosotros', segment: 'nosotros' },
    { label: 'Servicios', segment: 'servicios' },
    { label: 'Planes', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Instalaciones', segment: 'instalaciones', requiresFeature: 'showFacilities' },
    { label: 'Galería', segment: 'galeria', requiresFeature: 'showGallery' },
    { label: 'Horarios', segment: 'horarios', requiresFeature: 'showSchedule' },
    { label: 'Contacto', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,
    showTeam: true,
    showLocationMap: true,
    showProducts: true,
    showTrainingPlans: true,

    // Capacidades de operación (V2.1). Mítico tiene contratado el plan
    // `professional`; Aurora Fit sigue en `starter` de prueba y las mantiene
    // apagadas. Es la demostración de que son capacidades CONTRATADAS y no
    // código: encender una es cambiar esta línea, y apagarla hace que su ruta
    // responda 404, no que se esconda el enlace.
    enableAttendance: true,
    enableQrAttendance: true,
    enableNotifications: true,
    enableReports: true,
    enablePayments: true,
    enableMemberManagement: true,
  },

  seo: {
    title: 'Mítico Fitness — El dolor que sentirás hoy es la fuerza que sentirás mañana',
    titleTemplate: '%s | Mítico Fitness',
    description:
      'Gimnasio en La Paz. Paquetes mensuales desde 160 Bs, entrenamiento personalizado con rutinas temáticas, baile fitness, nutricionista y suplementación deportiva.',
    keywords: [
      'gimnasio la paz',
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
      eyebrow: 'La Paz, Bolivia',
      title: 'Vamos con',
      titleAccent: 'todo',
      subtitle:
        'El dolor que sentirás hoy es la fuerza que sentirás mañana. Entrenamiento personalizado, baile fitness, nutrición y suplementación en un solo lugar.',
      primaryCta: { label: 'Ver paquetes', segment: 'planes' },
      secondaryCta: { label: 'Hablar por WhatsApp', segment: 'contacto' },
      stats: [
        { value: '1.200', label: 'm² de entrenamiento' },
        { value: '+2.400', label: 'socios activos' },
        { value: '18', label: 'clases semanales' },
        { value: '6', label: 'años de trayectoria' },
      ],
    },

    about: {
      eyebrow: 'Mítico',
      title: 'Descubre el héroe que vive en ti',
      lead:
        'Mítico Fitness es un gimnasio de La Paz donde el entrenamiento se arma alrededor de la persona, no al revés.',
      paragraphs: [
        'Nuestros paquetes cubren desde la sesión suelta hasta el plan anual, con opciones que suman baile fitness, nutricionista profesional o entrenador personal según lo que cada uno necesite. Puedes empezar por un día y decidir después.',
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
      milestones: [
        { year: '2019', text: 'Abrimos la primera sala de 180 m² con catorce máquinas.' },
        { year: '2021', text: 'Sumamos el área funcional y las primeras clases grupales.' },
        { year: '2023', text: 'Mudanza a la sede actual: 1.200 m² en tres plantas.' },
        { year: '2025', text: 'Incorporamos evaluación de composición corporal para todos los socios.' },
        { year: '2026', text: 'Más de 2.400 socios activos y un equipo de 22 profesionales.' },
      ],
    },

    services: [
      {
        id: 'entrenamiento-personalizado',
        name: 'Entrenamiento personalizado',
        summary: 'Descubre el héroe que vive en ti.',
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
          'Disponible en los paquetes Fit Dance, Básico Dance, Mítico Fitness y Mítico Dance. Entrenas y bailas dentro de la misma membresía, sin pagar aparte.',
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
        id: 'mensual-basico',
        name: 'Paquete Mensual Básico',
        description:
          'Opciones ideales para comenzar tu transformación. Acceso completo al gimnasio con entrenamiento personalizado y horarios flexibles.',
        plans: [
          {
            id: 'basico',
            name: 'Paquete Básico',
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
              { label: 'Baile fitness', included: false },
              { label: 'Batido semanal', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
          {
            id: 'basico-dance',
            name: 'Paquete Básico Dance',
            tagline: 'Suma baile fitness',
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
              { label: 'Baile fitness', included: false },
              { label: 'Batido semanal', included: false },
              { label: 'Nutricionista profesional', included: false },
            ],
            ctaLabel: 'Consultar',
          },
        ],
      },
      {
        id: 'mensual-fit',
        name: 'Paquete Mensual Fit',
        description:
          'Potencia tus resultados con batidos semanales y asesoría nutricional profesional. Diseñados para quienes buscan un nivel superior de fitness.',
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
        ],
      },
      {
        id: 'mensual-mitico',
        name: 'Paquete Mensual Mítico',
        description:
          'La experiencia completa. Combina fitness, baile y nutrición profesional. Incluye clases especiales de bachata, twerking y dance fitness.',
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
        id: 'especiales',
        name: 'Paquetes especiales',
        description:
          'Planes extendidos con beneficios adicionales. Todos incluyen acceso completo y entrenamiento personalizado.',
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
      'Todos los precios están en bolivianos. Puedes pagar por QR o consultarnos por WhatsApp: te ayudamos a elegir el paquete que mejor se adapta a tus objetivos.',

    /**
     * Programas de entrenamiento personalizado. No llevan nombre comercial:
     * lo que los identifica es el precio, lo que incluyen y sus rutinas.
     * `imageSrc` queda reservado para la fotografía de referencia de cada uno.
     */
    trainingPlans: [
      {
        id: 'programa-220',
        price: 220,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenamiento personalizado', included: true },
          { label: 'Seguimiento personal', included: true },
          { label: '1 pre-entreno', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Entrenador personal', included: false },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Rutina Batman', 'Rutina Gamora'],
        ctaLabel: 'Consultar',
        seed: 31,
      },
      {
        id: 'programa-350',
        price: 350,
        currency: 'Bs',
        period: 'mensual',
        featured: false,
        features: [
          { label: 'Entrenamiento personalizado', included: true },
          { label: '2 pre-entrenos personal', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Entrenador personal', included: false },
          { label: 'Nutricionista profesional', included: false },
        ],
        routines: ['Rutina Capitán América', 'Rutina Capitana Marvel'],
        ctaLabel: 'Consultar',
        seed: 47,
      },
      {
        id: 'programa-400',
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
        routines: ['Rutina Thor', 'Rutina Fénix'],
        ctaLabel: 'Consultar',
        seed: 63,
      },
      {
        id: 'programa-480',
        price: 480,
        currency: 'Bs',
        period: 'mensual',
        featured: true,
        badge: 'Completo',
        features: [
          { label: 'Entrenador personal', included: true },
          { label: '2 pre-entrenos semanales', included: true },
          { label: '1 batido semanal', included: true },
          { label: 'Nutricionista profesional', included: true },
        ],
        routines: ['Rutina Hulk', 'Rutina Mujer Maravilla'],
        ctaLabel: 'Consultar',
        seed: 79,
      },
    ],

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

    facilities: [
      {
        id: 'sala-pesas',
        name: 'Sala de pesas',
        description:
          'Planta principal de 520 m² con equipamiento de marcas líderes, cuatro racks de potencia y una zona de peso libre que no se satura ni en hora pico.',
        area: '520 m²',
        icon: 'dumbbell',
        stats: [
          { label: 'Racks de potencia', value: '4' },
          { label: 'Estaciones', value: '62' },
          { label: 'Mancuernas', value: '2–50 kg' },
        ],
      },
      {
        id: 'funcional',
        name: 'Área funcional',
        description:
          'Espacio abierto con piso amortiguado, trineos, cuerdas de batalla y estructura de calistenia. Diseñado para circuitos y trabajo en grupo reducido.',
        area: '300 m²',
        icon: 'boxing',
        stats: [
          { label: 'Piso amortiguado', value: 'Sí' },
          { label: 'Cupo por circuito', value: '12' },
          { label: 'Kettlebells', value: '4–40 kg' },
        ],
      },
      {
        id: 'salon-clases',
        name: 'Salón de clases',
        description:
          'Sala insonorizada con espejos de pared completa, sistema de audio profesional y climatización independiente. Sede de las dieciocho clases semanales.',
        area: '180 m²',
        icon: 'group',
        stats: [
          { label: 'Capacidad', value: '28' },
          { label: 'Clases/semana', value: '18' },
          { label: 'Climatización', value: 'Independiente' },
        ],
      },
      {
        id: 'cardio',
        name: 'Zona de cardio',
        description:
          'Cintas, elípticos, remos y bicicletas de aire frente al ventanal norte. Cada equipo con pantalla propia y toma de carga.',
        area: '140 m²',
        icon: 'heart',
        stats: [
          { label: 'Equipos', value: '24' },
          { label: 'Pantalla propia', value: 'Todos' },
          { label: 'Luz natural', value: 'Ventanal norte' },
        ],
      },
      {
        id: 'recuperacion',
        name: 'Zona de recuperación',
        description:
          'Área silenciosa para movilidad, estiramiento asistido y masaje deportivo con turno previo. Rodillos, bandas y camillas disponibles.',
        area: '60 m²',
        icon: 'spa',
        stats: [
          { label: 'Camillas', value: '3' },
          { label: 'Turnos', value: 'Con reserva' },
          { label: 'Uso libre', value: 'Rodillos y bandas' },
        ],
      },
      {
        id: 'vestuarios',
        name: 'Vestuarios',
        description:
          'Vestuarios amplios con casilleros, duchas de agua caliente permanente y área de secado. Limpieza documentada tres veces al día.',
        area: '110 m²',
        icon: 'shield',
        stats: [
          { label: 'Casilleros', value: '160' },
          { label: 'Duchas', value: '12' },
          { label: 'Limpieza', value: '3×/día' },
        ],
      },
    ],

    gallery: [
      { id: 'g1', title: 'Sala principal', caption: 'Planta de pesas en horario pico', span: 2, seed: 11 },
      { id: 'g2', title: 'Zona de fuerza', caption: 'Plataformas y racks de potencia', span: 1, seed: 27 },
      { id: 'g3', title: 'Área funcional', caption: 'Circuito de alta intensidad', span: 1, seed: 42 },
      { id: 'g4', title: 'Clase de spinning', caption: 'Martes y jueves, 19:00', span: 1, seed: 58 },
      { id: 'g5', title: 'Cardio', caption: 'Ventanal norte al atardecer', span: 2, seed: 73 },
      { id: 'g6', title: 'Recuperación', caption: 'Movilidad y estiramiento asistido', span: 1, seed: 89 },
      { id: 'g7', title: 'Recepción', caption: 'Entrada principal del gimnasio', span: 1, seed: 104 },
      { id: 'g8', title: 'Comunidad', caption: 'Reto mensual de fin de mes', span: 1, seed: 120 },
    ],

    team: [
      {
        id: 't1',
        name: 'Camila Rojas',
        role: 'Coordinadora metodológica',
        bio: 'Licenciada en Ciencias del Deporte. Diseña y audita los programas de todos los entrenadores del equipo.',
        specialties: ['Programación de fuerza', 'Readaptación'],
        seed: 7,
      },
      {
        id: 't2',
        name: 'Diego Antelo',
        role: 'Entrenador de fuerza',
        bio: 'Ocho años en levantamiento olímpico. Lleva la zona de peso libre y la preparación de competidores.',
        specialties: ['Levantamiento olímpico', 'Powerlifting'],
        seed: 23,
      },
      {
        id: 't3',
        name: 'Valeria Suárez',
        role: 'Instructora de clases grupales',
        bio: 'Certificada en spinning, GAP y movilidad. Responsable del calendario semanal de clases.',
        specialties: ['Spinning', 'HIIT', 'Movilidad'],
        seed: 51,
      },
      {
        id: 't4',
        name: 'Martín Céspedes',
        role: 'Nutricionista deportivo',
        bio: 'Atiende dentro del gimnasio. Trabaja sobre hábitos reales y compras semanales, no sobre dietas ideales.',
        specialties: ['Composición corporal', 'Nutrición deportiva'],
        seed: 66,
      },
    ],

    testimonials: [
      {
        id: 'ts1',
        quote:
          'Llevaba años empezando y dejando gimnasios. Acá me hicieron una evaluación, me armaron algo realista y por primera vez pasé del tercer mes. Ya van dos años.',
        author: 'Andrea M.',
        context: 'Socia desde 2024 · Paquete Fit',
        rating: 5,
      },
      {
        id: 'ts2',
        quote:
          'Volví de una lesión de rodilla con miedo. Diego me armó una progresión de seis meses y no tuve una sola recaída. El seguimiento fue serio de verdad.',
        author: 'Rodrigo V.',
        context: 'Socio desde 2023 · Mítico Dance',
        rating: 5,
      },
      {
        id: 'ts3',
        quote:
          'Lo que más valoro es que siempre hay alguien en sala. No es el gimnasio donde entras, haces cualquier cosa y te vas. Te corrigen.',
        author: 'Paola C.',
        context: 'Socia desde 2022 · Paquete Básico',
        rating: 5,
      },
    ],

    faq: [
      {
        id: 'empezar',
        question: '¿Cuánto cuesta empezar?',
        answer:
          'La sesión individual cuesta 25 Bs y te da acceso completo al gimnasio por un día. Si prefieres el mes, el Paquete Mensual Básico está en 160 Bs e incluye entrenamiento personalizado, horario flexible y acceso a todas las máquinas.',
      },
      {
        id: 'pago',
        question: '¿Cómo puedo pagar?',
        answer:
          'Puedes pagar por QR. Si tienes dudas sobre qué paquete te conviene, escríbenos por WhatsApp al 77700867 y te asesoramos antes de que pagues.',
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
          'Sí, en el mostrador del gimnasio. Tenemos proteína, creatina, pre-entrenos, hidratación, shakers, tomatodos y las poleras de la casa. Consúltanos por WhatsApp y te decimos qué hay disponible.',
      },
    ],

    // El QR del banco todavía no lo entregó el gimnasio: la ventana reserva
    // su hueco y mientras tanto explica cómo se paga. Ver `PaymentQrInfo`.
    paymentQr: {
      holder: 'Mítico Fitness',
      note:
        'Pide el QR en recepción o escríbenos por WhatsApp y te lo enviamos. ' +
        'Envía el comprobante con tu nombre completo para activar tu paquete el mismo día.',
    },

    closingCta: {
      title: '¡Vamos con todo!',
      subtitle:
        'El dolor que sentirás hoy es la fuerza que sentirás mañana. Escríbenos y armamos tu plan.',
      label: 'Consultar por WhatsApp',
    },
  },
};
