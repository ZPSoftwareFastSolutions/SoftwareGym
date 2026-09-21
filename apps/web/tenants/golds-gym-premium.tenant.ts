/**
 * CONFIGURACIÓN DE TENANT — GOLD'S GYM PREMIUM
 *
 * Este archivo es el único artefacto propio de este cliente. No existe ningún
 * componente, ruta, consulta ni hoja de estilo específica de GOLD: la vitrina
 * por sucursales, el carrusel de anuncios y el reparto de instalaciones son
 * capacidades del PRODUCTO que cualquier otro gimnasio enciende igual.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ORIGEN DE LOS DATOS
 *
 * REAL (folleto y datos entregados por el cliente):
 *   · nombre y dirección de la sede principal
 *   · los dos teléfonos
 *   · horario de atención (L-V, sábado y domingo)
 *   · los cuatro paquetes mensuales con sus precios y características
 *   · los tres planes de larga duración con sus precios
 *   · nombres de las cuatro sucursales
 *   · el calendario de clases y las clases especiales (viven en la BASE, no aquí)
 *
 * PENDIENTE DE CONFIRMAR CON EL CLIENTE — no se ha inventado ninguno:
 *   · `legalName` (razón social): hoy repite el nombre comercial
 *   · `contact.email`: vacío. La vitrina omite la línea en vez de inventarla
 *   · `contact.city`: vacío. Las sucursales están en zonas de La Paz y El Alto
 *     y el folleto no dice a cuál pertenece cada una
 *   · cuál de los dos teléfonos es WhatsApp (se usa el primero)
 *   · direcciones de las tres sucursales que no son la principal
 *   · redes sociales, mapa y dominio propio
 *   · superficie y fichas de datos de cada área (`area` y `stats` vacíos)
 *   · características propias de cada sucursal: hoy las seis áreas de la
 *     plantilla se declaran iguales en las cuatro sedes
 *   · fotografías (galería y anuncios)
 *   · mensualidad de Karate: el folleto no la trae. Karate existe como CLASE
 *     con su horario; no se ha creado ningún paquete con precio inventado
 *   · «Plan Mañanero: de 07:00 AM hasta las 12:00»: el folleto dice «12:00 AM».
 *     Se transcribe tal cual y se marca para que el cliente lo aclare
 *
 * Las SUCURSALES, los PLANES vendibles, las CLASES y sus HORARIOS viven en la
 * base de datos (gerencia los edita sin desplegar). Aquí solo está el texto de
 * vitrina, unido a la base por `code`.
 */

import type { FacilityItem } from '@core/domain/catalog/catalog';
import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { DEFAULT_FEATURE_FLAGS } from '@core/domain/tenant/feature-flags';

/**
 * Códigos de las cuatro sucursales. Son los mismos `branches.code` de la base:
 * el puente entre el texto de vitrina de este archivo y los datos operativos.
 */
const SEDES = ['LAVITA', 'GARITA', 'CRUCEVILLAS', 'ELALTO'] as const;

/**
 * Plantilla de áreas. El cliente todavía no entregó qué tiene cada sucursal,
 * así que las seis áreas se declaran iguales en las cuatro: la ESTRUCTURA por
 * sede ya está, y el día que diga «en Garita no hay salón de clases» se corrige
 * quitando esa entrada, sin tocar una línea de código.
 *
 * `area` y `stats` van vacíos a propósito: son metros y cifras que nadie midió,
 * y la sección los omite en lugar de enseñar huecos.
 */
const AREAS_DE_LA_PLANTILLA: readonly Omit<FacilityItem, 'branchCode'>[] = [
  {
    id: 'sala-pesas',
    name: 'Sala de pesas',
    description: 'Máquinas y peso libre para el trabajo de fuerza, incluidas en todos los paquetes.',
    area: '',
    icon: 'dumbbell',
    stats: [],
  },
  {
    id: 'area-funcional',
    name: 'Área funcional',
    description: 'Espacio abierto para circuitos y entrenamiento funcional en grupo reducido.',
    area: '',
    icon: 'boxing',
    stats: [],
  },
  {
    id: 'salon-clases',
    name: 'Salón de clases',
    description: 'Donde se dictan Ubound, Baile, Full Kombat, Fight Do, Yoga, Folklore y el resto del calendario.',
    area: '',
    icon: 'group',
    stats: [],
  },
  {
    id: 'zona-cardio',
    name: 'Zona de cardio',
    description: 'Equipos de cardio y la sala de spinning, con horarios propios de lunes a viernes.',
    area: '',
    icon: 'heart',
    stats: [],
  },
  {
    id: 'zona-recuperacion',
    name: 'Zona de recuperación',
    description: 'Área para movilidad y estiramiento después del entrenamiento.',
    area: '',
    icon: 'spa',
    stats: [],
  },
  {
    id: 'vestuario',
    name: 'Vestuario',
    description: 'Vestidores, duchas y casilleros, incluidos en los paquetes que los contemplan.',
    area: '',
    icon: 'shield',
    stats: [],
  },
];

/**
 * Las áreas de cada sede. Se derivan de la plantilla para no repetir cuatro
 * veces el mismo texto: es configuración construida, no lógica de producto.
 * El id lleva el código de la sede porque tiene que ser único en todo el tenant.
 */
const INSTALACIONES_POR_SEDE: readonly FacilityItem[] = SEDES.flatMap((code) =>
  AREAS_DE_LA_PLANTILLA.map((area) => ({
    ...area,
    id: `${area.id}-${code.toLowerCase()}`,
    branchCode: code,
  })),
);

/**
 * «Así se ve por dentro» (encargo V4.1 §5). Las mismas seis áreas y sus mismos
 * textos: nada nuevo que afirmar sobre el gimnasio. Sin `src` todavía, así que
 * cada pieza se dibuja con la composición generativa de la marca (`ArtFrame`),
 * que es la decisión del producto para cuando faltan fotos: ni stock ajeno ni
 * marcos vacíos. PENDIENTE (G14): el día que lleguen las fotografías se rellena
 * `src` y el mosaico no cambia de forma.
 */
const GALERIA_POR_DENTRO = AREAS_DE_LA_PLANTILLA.map((area, indice) => ({
  id: `por-dentro-${area.id}`,
  title: area.name,
  // Sin pie: la descripción de cada área ya está justo encima, en
  // «Instalaciones». Repetirla palabra por palabra sería relleno.
  caption: '',
  // Ritmo del mosaico en tres columnas, sin huecos: 2+1 · 1+2 · 2+1.
  span: (indice === 0 || indice === 3 || indice === 4 ? 2 : 1) as 1 | 2,
  seed: 41 + indice * 17,
}));

export const goldsGymPremiumTenant: TenantConfig = {
  slug: 'golds-gym-premium',
  name: "Gold's Gym Premium",
  // PENDIENTE: razón social real.
  legalName: "Gold's Gym Premium",
  tagline: 'Cuatro sucursales, una sola membresía',

  // PENDIENTE: dominio propio. Vacío mientras se sirve bajo /golds-gym-premium.
  domains: [],

  /**
   * V4.2 · Sistema de diseño «Titanium Gold Championship», entregado por el
   * cliente con su maqueta de portada (2026-09-16): oro de campeonato con
   * acabado metálico sobre carbón, carmesí como color de energía, titulares
   * Oswald en mayúsculas, cuerpo Montserrat y lemas a pincel (Permanent Marker).
   * Radios contenidos: nada de píldoras en controles ni contenedores.
   *
   * Contraste medido (WCAG) sobre el fondo #0B0B0C: texto #EDEDED 16,8:1, gris
   * #A0A0A5 7,6:1, oro #D4AF37 9,4:1. El carmesí #D62828 da 3,9:1: vale solo
   * para texto GRANDE (los lemas) y como fondo de insignias con texto blanco
   * (5,0:1); nunca para texto pequeño sobre el fondo.
   */
  branding: {
    mode: 'dark',
    logo: {
      wordmark: "Gold's Gym",
      wordmarkAccent: 'Gym',
      subMark: 'Premium Fitness Club',
      monogram: 'G',
    },
    palette: {
      primary: '#D4AF37',
      primaryStrong: '#B89025',
      structural: '#9A7B38',
      structuralDeep: '#5C481A',
      surface: '#0B0B0C',
      surfaceRaised: '#131315',
      surfaceCard: '#141416',
      text: '#EDEDED',
      textMuted: '#A0A0A5',
      border: '#2E2A1F',
      // Luz del degradado metálico (champán).
      accent: '#F3D068',
      highlight: '#D62828',
    },
    typography: {
      display: 'var(--font-display-oswald), "Arial Narrow", sans-serif',
      body: 'var(--font-body-montserrat), system-ui, sans-serif',
      script: 'var(--font-script-marker), cursive',
      scale: 'balanced',
      uppercaseHeadings: true,
      headingTracking: '0.02em',
      labelCase: 'uppercase',
    },
    shape: {
      corners: 'soft',
      surfaceStyle: 'flat',
      glowIntensity: 0,
      showGrid: false,
      accentFinish: 'metallic',
    },
  },

  contact: {
    phone: '+591 69710992',
    // PENDIENTE: confirmar cuál de los dos números atiende WhatsApp.
    whatsapp: '59169710992',
    whatsappMessage: "Hola Gold's Gym Premium 👋 Quiero información sobre los planes y horarios.",
    // PENDIENTE: el cliente no entregó correo. Vacío = la vitrina omite la línea.
    email: '',
    addressLine: 'Av. Apumalla #422, Caparazón Mall Center 4° Piso',
    // PENDIENTE: el folleto no dice la ciudad de cada sucursal.
    city: '',
    country: 'Bolivia',
    // PENDIENTE: mapa del local. Sin URL, el bloque de ubicación no se dibuja.
  },

  // PENDIENTE: el cliente no entregó sus redes. Vacías se muestran inertes.
  social: {},

  hours: {
    timezone: 'America/La_Paz',
    week: [
      { day: 'Lunes', open: '07:00', close: '22:00', closed: false },
      { day: 'Martes', open: '07:00', close: '22:00', closed: false },
      { day: 'Miércoles', open: '07:00', close: '22:00', closed: false },
      { day: 'Jueves', open: '07:00', close: '22:00', closed: false },
      { day: 'Viernes', open: '07:00', close: '22:00', closed: false },
      { day: 'Sábado', open: '08:00', close: '21:00', closed: false },
      { day: 'Domingo', open: '07:00', close: '13:00', closed: false },
    ],
  },

  navigation: [
    { label: 'Inicio', segment: '' },
    { label: 'Planes', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Clases', segment: 'clases', requiresFeature: 'enableClasses' },
    { label: 'Sucursales', segment: 'sucursales', requiresFeature: 'enableMultiBranch' },
    { label: 'Instalaciones', segment: 'instalaciones', requiresFeature: 'showFacilities' },
    { label: 'Horarios', segment: 'horarios', requiresFeature: 'showSchedule' },
    { label: 'Contacto', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,

    /**
     * GOLD comunica por anuncios tipo panfleto (clases nuevas, eventos,
     * promociones), así que el inicio los muestra primero. Es la capacidad
     * `enableAnnouncements` del producto, no una portada propia: los anuncios se
     * publican desde `/panel/anuncios` y viven en la base.
     */
    enableAnnouncements: true,

    // Cuatro sucursales. Las sedes NO se declaran aquí: son datos de la base
    // que gerencia administra en /panel/sucursales.
    enableMultiBranch: true,

    // Calendario de clases (Ubound, Full Kombat, Fight Do, Yoga, Spinning,
    // Karate…) con su horario semanal por sede. También son datos de la base.
    enableClasses: true,

    // V4.2 · La operación que pidió el encargo «GOLD'S GYM PREMIUM — V1»:
    // control de acceso con QR y foto (§4, §8), recepción que escanea y da de
    // alta (§9), pagos y comprobantes (§13), membresías, historial de ingresos
    // (§12) y reservas (§16). Hasta V4.1 estaban apagadas «pendientes de
    // contratación»; V1 es justamente esa contratación. Son las MISMAS
    // capacidades que usa Mítico, no una variante de GOLD.
    enableAttendance: true,
    enableQrAttendance: true,
    enableMemberManagement: true,
    enablePayments: true,
    enableNotifications: true,
    enableReports: true,
    enableReservations: true,

    // V4.3 · El mostrador vende suplementos y bebidas en cada sede: el
    // inventario es por sucursal, como las existencias reales.
    enableInventory: true,

    // Siguen apagados porque V1 no los pidió: entrenadores, catálogo de
    // ejercicios y rutinas. Apagados, sus rutas responden 404; no es que estén
    // escondidas.

    // «Así se ve por dentro» con la composición de marca mientras no haya fotos
    // (ver `GALERIA_POR_DENTRO`). Con fotos, se rellena `src` y nada más cambia.
    showGallery: true,
    // El folleto no trae equipo, testimonios ni preguntas frecuentes.
    showTeam: false,
    showTestimonials: false,
    showFaq: false,
    // Cada sede dibuja su mapa con sus coordenadas, las de su enlace de Google
    // Maps o su dirección; sin ninguna, la tarjeta muestra el arte de la marca.
    showLocationMap: true,
  },

  seo: {
    title: "Gold's Gym Premium — Cuatro sucursales, una sola membresía",
    titleTemplate: "%s | Gold's Gym Premium",
    description:
      "Gold's Gym Premium: cuatro sucursales, planes mensuales desde 150 Bs y más de treinta clases semanales —Ubound, Full Kombat, Fight Do, Body Pump, Yoga, Baile, Spinning y Karate—. Abierto de lunes a domingo.",
    keywords: [
      'golds gym premium',
      'gimnasio bolivia',
      'clases de aerobicos',
      'ubound',
      'full kombat',
      'fight do',
      'spinning',
      'karate',
      'planes de gimnasio',
    ],
    locale: 'es_BO',
  },

  provisioning: {
    plan: 'professional',
    activeSince: '2026-09-15',
    status: 'trial',
  },

  /**
   * V4.2 · La portada que pidió el encargo (V4.1 §6 y §17): identidad, anuncios,
   * planes y tarifas, horarios, instalaciones por sucursal, «Así se ve por
   * dentro» y contacto. Sin marquesina ni servicios: la trayectoria y lo
   * institucional no son el eje. Es la capacidad `home` de la plataforma; no hay
   * ninguna portada «de GOLD» en el código.
   */
  /**
   * V4.2 · Alta en línea: la persona crea su cuenta, elige su plan, paga con el
   * QR y sube el comprobante desde la web. Recepción lo aprueba y, en su primera
   * visita, completa en persona el documento, el teléfono y la fecha de
   * nacimiento; hasta entonces se ve como «socio pendiente».
   */
  members: {
    onlineSignup: true,
    inPersonFields: ['documentId', 'phone', 'birthDate'],
  },

  home: {
    estilo: 'anuncios',
    planes: 'tarifario',
    secciones: ['planes', 'horarios', 'instalaciones', 'por-dentro', 'sucursales', 'cierre'],
  },

  content: {
    hero: {
      eyebrow: 'Cuatro sucursales de élite',
      title: 'Entrena',
      titleAccent: 'en Gold',
      motto: 'Disciplina · Fuerza · Pasión',
      branchesLabel: 'Nuestras sedes oficiales',
      announcementsLabel: 'Novedades y eventos',
      subtitle:
        'Máquinas, aeróbicos, spinning y más de treinta clases semanales. Elige tu plan y entrena de lunes a domingo en cualquiera de nuestras cuatro sucursales.',
      primaryCta: { label: 'Ver planes', segment: 'planes' },
      secondaryCta: { label: 'Ver clases', segment: 'clases' },
      stats: [
        { value: '4', label: 'sucursales' },
        { value: '150', label: 'Bs desde' },
        { value: '7', label: 'días x semana' },
        { value: '10', label: 'clases aeróbicas' },
      ],
    },

    /**
     * La trayectoria NO es el eje de esta portada (el carrusel de anuncios lo
     * es), pero la página `/nosotros` existe y necesita contenido. Se describe
     * por lo que el folleto dice de la oferta, sin inventar historia ni hitos.
     */
    about: {
      eyebrow: 'Gold',
      title: 'Todo lo que necesitas para entrenar',
      lead:
        "Gold's Gym Premium reúne máquinas, aeróbicos y spinning en cuatro sucursales, con planes pensados para distintas formas de entrenar.",
      paragraphs: [
        'Nuestros planes van desde el acceso completo hasta el paquete de aeróbicos, que vale en cualquiera de nuestras sucursales. Quien entrena de mañana tiene su propio plan, y quien prefiere elegir sus días entrena tres veces por semana con el plan Normal.',
        'El calendario de clases va de lunes a domingo e incluye Ubound, Full Kombat, Fight Do, Body Combat, Body Pump, Yoga, Folklore, Baile, Strong y Oxígeno. Spinning y Karate tienen horarios propios durante la semana.',
      ],
      values: [
        {
          title: 'Cuatro sucursales',
          description: 'Entrena donde te quede mejor. El plan de aeróbicos vale en cualquiera de ellas.',
          icon: 'group',
        },
        {
          title: 'Más de treinta clases',
          description: 'De lunes a domingo, de la mañana a la noche, con instructores en sala.',
          icon: 'heart',
        },
        {
          title: 'Spinning y Karate',
          description: 'Disciplinas con horario propio durante la semana, además del calendario de sala.',
          icon: 'cycling',
        },
        {
          title: 'Siete días por semana',
          description: 'Lunes a viernes de 07:00 a 22:00, sábados hasta las 21:00 y domingos por la mañana.',
          icon: 'clock',
        },
      ],
      // PENDIENTE: el cliente no entregó hitos ni años de trayectoria.
      milestones: [],
    },

    services: [
      {
        id: 'maquinas',
        name: 'Máquinas y pesas',
        summary: 'Acceso completo al equipamiento del gimnasio.',
        description:
          'Sala de pesas y máquinas, incluidas en los planes Normal, Ejecutivo y Mañanero. El plan Normal suma todos los servicios.',
        icon: 'dumbbell',
        highlights: ['Incluido desde 170 Bs', 'Peso libre y máquinas', 'Cuatro sucursales'],
      },
      {
        id: 'aerobicos',
        name: 'Aeróbicos',
        summary: 'Diez clases distintas dentro del plan de aeróbicos.',
        description:
          'Ubound, Baile Fitness, Full Kombat, Fight Do, Body Combat, Folklore, Step, X-55, Yoga y Oxígeno. El plan Aeróbicos vale en cualquier sucursal.',
        icon: 'group',
        highlights: ['150 Bs al mes', 'Diez disciplinas', 'Válido en cualquier sucursal'],
      },
      {
        id: 'spinning',
        name: 'Spinning',
        summary: 'Sesiones con horario propio de lunes a viernes.',
        description:
          'Lunes, miércoles y viernes de 08:00 a 09:00; lunes de 18:00 a 19:00 y de 19:30 a 20:30; miércoles, jueves y viernes de 19:00 a 20:00. Incluido en el plan Ejecutivo.',
        icon: 'cycling',
        highlights: ['Incluido en el plan Ejecutivo', 'Mañana y noche', 'Horario propio'],
      },
      {
        id: 'karate',
        name: 'Karate',
        summary: 'Martes, miércoles y viernes por la tarde.',
        description:
          'Dos bloques por día: de 14:00 a 15:30 y de 15:30 a 17:00. Consulta la mensualidad en recepción.',
        icon: 'boxing',
        highlights: ['Martes, miércoles y viernes', 'Dos bloques por tarde', 'Consulta en recepción'],
      },
      {
        id: 'vestuarios',
        name: 'Duchas, casilleros y vestidores',
        summary: 'Incluidos en los planes que los contemplan.',
        description:
          'Duchas, casilleros y vestidores forman parte del plan Ejecutivo y del plan Normal, que incluye todos los servicios.',
        icon: 'shield',
        highlights: ['Duchas', 'Casilleros', 'Vestidores'],
      },
    ],

    /**
     * Los paquetes del folleto. Cada uno comparte su `code` con la fila de
     * `membership_plans` en la base: así «Pagar con QR» sabe qué plan es y el
     * precio que se cobra sale de la base, no de este archivo.
     */
    planGroups: [
      {
        id: 'mensuales',
        name: 'Planes mensuales',
        description: 'Elige cómo quieres entrenar: acceso completo, aeróbicos o el horario de la mañana.',
        plans: [
          {
            id: 'normal',
            name: 'Plan Normal',
            tagline: 'Todos los servicios, tres días por semana',
            price: 250,
            currency: 'Bs',
            period: 'mensual',
            featured: true,
            badge: 'Más completo',
            features: [
              { label: 'Entrena 3 veces por semana', included: true },
              { label: 'Escoge tus días de entrenamiento', included: true },
              { label: 'Incluye todos los servicios', included: true },
            ],
            ctaLabel: 'Quiero este plan',
          },
          {
            id: 'mananero',
            name: 'Plan Mañanero',
            // PENDIENTE: el folleto dice «desde las 07:00 AM hasta las 12:00 AM».
            // Se transcribe tal cual; el cliente tiene que aclarar el cierre.
            tagline: 'Acceso a todo en horario de mañana',
            price: 186,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Acceso a todo desde las 07:00', included: true },
              { label: 'Hasta las 12:00 (horario por confirmar)', included: true },
            ],
            ctaLabel: 'Quiero este plan',
          },
          {
            id: 'ejecutivo',
            name: 'Plan Ejecutivo',
            tagline: 'Máquinas, aeróbicos y spinning',
            price: 170,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: 'Máquinas', included: true },
              { label: 'Aeróbicos', included: true },
              { label: 'Spinning', included: true },
              { label: 'Duchas', included: true },
              { label: 'Casilleros', included: true },
              { label: 'Vestidores', included: true },
            ],
            ctaLabel: 'Quiero este plan',
          },
          {
            id: 'aerobicos',
            name: 'Plan Aeróbicos',
            tagline: 'Válido en cualquier sucursal',
            price: 150,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            badge: 'Cualquier sucursal',
            features: [
              { label: 'Ubound', included: true },
              { label: 'Baile Fitness', included: true },
              { label: 'Full Kombat', included: true },
              { label: 'Fight Do', included: true },
              { label: 'Body Combat', included: true },
              { label: 'Folklore', included: true },
              { label: 'Step', included: true },
              { label: 'X-55', included: true },
              { label: 'Yoga', included: true },
              { label: 'Oxígeno', included: true },
            ],
            ctaLabel: 'Quiero este plan',
          },
        ],
      },
      {
        id: 'larga-duracion',
        name: 'Planes de larga duración',
        description: 'Paga por adelantado y entrena durante todo el periodo.',
        plans: [
          {
            id: 'trimestral',
            name: '3 Meses',
            tagline: 'Un trimestre completo',
            price: 520,
            currency: 'Bs',
            period: 'trimestral',
            featured: false,
            features: [{ label: 'Tres meses de acceso', included: true }],
            ctaLabel: 'Quiero este plan',
          },
          {
            id: 'semestral',
            name: '6 Meses',
            tagline: 'Medio año de entrenamiento',
            price: 1000,
            currency: 'Bs',
            period: 'semestral',
            featured: true,
            badge: 'Más elegido',
            features: [{ label: 'Seis meses de acceso', included: true }],
            ctaLabel: 'Quiero este plan',
          },
          {
            id: 'anual',
            name: 'Anual',
            tagline: 'Un año entero',
            price: 1900,
            currency: 'Bs',
            period: 'anual',
            featured: false,
            features: [{ label: 'Doce meses de acceso', included: true }],
            ctaLabel: 'Quiero este plan',
          },
        ],
      },
    ],

    plansNote:
      'Precios en bolivianos. La mensualidad de Karate se consulta en recepción. Consúltanos por WhatsApp por promociones vigentes.',

    // El folleto no ofrece entrenamiento personalizado ni venta de productos.
    trainingPlans: [],
    products: [],

    facilities: INSTALACIONES_POR_SEDE,

    // PENDIENTE: fotografías del gimnasio. `showGallery` está apagada.
    gallery: GALERIA_POR_DENTRO,
    team: [],
    testimonials: [],
    faq: [],

    closingCta: {
      title: 'Empieza cuando quieras',
      subtitle:
        'Escríbenos por WhatsApp y te decimos qué plan te conviene y en qué sucursal tienes las clases que buscas.',
      label: 'Escribir por WhatsApp',
    },

    /**
     * Vitrina de sucursales. Los nombres son los que entregó el cliente; las
     * direcciones, horarios y mapas vienen de la base y todavía están pendientes
     * salvo la de la sede principal.
     */
    branches: {
      eyebrow: 'Nuestras sucursales',
      title: 'Cuatro sucursales,',
      titleAccent: 'una sola membresía',
      lead: 'Entrena donde te quede mejor. El plan de aeróbicos vale en cualquiera de nuestras sucursales.',
      benefits: [
        {
          title: 'Aeróbicos en cualquier sede',
          description: 'El plan Aeróbicos es válido en las cuatro sucursales, sin pagar aparte.',
          icon: 'shield',
        },
        {
          title: 'El mismo horario',
          description: 'Lunes a viernes de 07:00 a 22:00, sábados hasta las 21:00 y domingos por la mañana.',
          icon: 'clock',
        },
        {
          title: 'Las mismas clases',
          description: 'Ubound, Full Kombat, Fight Do, Yoga y el resto del calendario semanal.',
          icon: 'group',
        },
      ],
      showcase: [
        {
          code: 'LAVITA',
          tagline: 'La sede principal',
          description:
            'Nuestra sede de La Vita, en el Caparazón Mall Center. Máquinas, sala de clases y el calendario semanal completo.',
          highlights: ['Caparazón Mall Center, 4° Piso', 'Calendario de clases completo'],
          seed: 17,
        },
        {
          code: 'GARITA',
          tagline: 'Gold Gym Body',
          description: 'Nuestra sucursal de la Garita.',
          // PENDIENTE: dirección y características propias de esta sede.
          highlights: [],
          seed: 39,
          mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d604.2363266344745!2d-68.14715510463752!3d-16.495946634514826!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915edf4b559ba919%3A0x62636013ad8ca940!2sCENTENARIO%20GOLD!5e0!3m2!1ses!2sbo!4v1789736504491!5m2!1ses!2sbo',
        },
        {
          code: 'CRUCEVILLAS',
          tagline: 'Cruce de Villas',
          description: 'Nuestra sucursal del Cruce de Villas.',
          // PENDIENTE: dirección y características propias de esta sede.
          highlights: [],
          seed: 61,
          mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d239.10016853448386!2d-68.11600443065473!3d-16.495643364996667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f210078c8f967%3A0x1ba86b25ff7acc3b!2sGold\'s%20Gym%20Body%20cruce!5e0!3m2!1ses!2sbo!4v1789734420585!5m2!1ses!2sbo',
        },
        {
          code: 'ELALTO',
          tagline: 'GOLD\'S GYM EL ALTO',
          description: 'Nuestra sucursal de El Alto.',
          // PENDIENTE: dirección y características propias de esta sede.
          highlights: [],
          seed: 83,
          mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5716.43399282623!2d-68.16290328400687!3d-16.507768763604112!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915edf875372f037%3A0xa934b515afed9297!2sGOLD%C2%B4S%20GYM%20BODDY!5e0!3m2!1ses!2sbo!4v1789734502907!5m2!1ses!2sbo',
        },
      ],
    },
  },
};
