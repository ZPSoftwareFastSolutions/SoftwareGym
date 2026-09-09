/**
 * CONFIGURACIÓN DE TENANT — AURORA FIT
 *
 * Segundo gimnasio de la plataforma. Existe para DEMOSTRAR que el producto es
 * realmente enlatado: comparte el 100% del código con Mítico Fitness y no
 * comparte ni un color, ni una tipografía, ni una forma, ni un texto.
 *
 * Diferencias deliberadas respecto de Mítico:
 *   · Tema claro en vez de oscuro.
 *   · Paleta cálida (terracota/ámbar) en vez de verde neón.
 *   · Esquinas redondeadas y superficies elevadas en vez de cristal con glow.
 *   · Títulos en caja mixta, escala tipográfica distinta.
 *   · Feature flags distintas: sin equipo, sin FAQ, sin mapa.
 *   · Cuatro planes con periodicidad mixta en vez de tres mensuales.
 *
 * Si al abrir los dos sitios uno junto al otro no parecieran el mismo
 * producto, la arquitectura está cumpliendo su objetivo.
 */

import type { TenantConfig } from '@core/domain/tenant/tenant-config';
import { DEFAULT_FEATURE_FLAGS } from '@core/domain/tenant/feature-flags';

export const auroraFitTenant: TenantConfig = {
  slug: 'aurora-fit',
  name: 'Aurora Fit',
  legalName: 'Aurora Bienestar S.R.L.',
  tagline: 'Movimiento consciente, todos los días',

  domains: ['aurorafit.bo', 'www.aurorafit.bo'],

  branding: {
    mode: 'light',
    logo: {
      wordmark: 'Aurora',
      subMark: 'Fit Studio',
      monogram: 'A',
    },
    palette: {
      primary: '#E4572E',
      primaryStrong: '#C4431E',
      structural: '#7A3B23',
      structuralDeep: '#452115',
      surface: '#FBF7F4',
      surfaceRaised: '#FFFFFF',
      surfaceCard: '#FFFFFF',
      text: '#241C18',
      textMuted: '#6E5F57',
      border: '#E8DDD5',
      accent: '#D9A441',
    },
    typography: {
      display: 'var(--font-display-serif), Georgia, serif',
      body: 'var(--font-body-sans), system-ui, sans-serif',
      scale: 'balanced',
      uppercaseHeadings: false,
      headingTracking: '-0.02em',
    },
    shape: {
      corners: 'rounded',
      surfaceStyle: 'elevated',
      glowIntensity: 0,
      showGrid: false,
    },
  },

  contact: {
    phone: '+591 700 98765',
    whatsapp: '59170098765',
    whatsappMessage: 'Hola Aurora Fit 🌅 Me gustaría reservar una clase de prueba.',
    email: 'hola@aurorafit.bo',
    addressLine: 'Calle España #412, Zona Recoleta',
    city: 'Cochabamba',
    country: 'Bolivia',
    mapEmbedUrl: '',
    mapLinkUrl: '',
  },

  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
  },

  hours: {
    timezone: 'America/La_Paz',
    week: [
      { day: 'Lunes', open: '06:30', close: '21:00', closed: false },
      { day: 'Martes', open: '06:30', close: '21:00', closed: false },
      { day: 'Miércoles', open: '06:30', close: '21:00', closed: false },
      { day: 'Jueves', open: '06:30', close: '21:00', closed: false },
      { day: 'Viernes', open: '06:30', close: '20:00', closed: false },
      { day: 'Sábado', open: '08:00', close: '13:00', closed: false, note: 'Solo clases' },
      { day: 'Domingo', open: '', close: '', closed: true },
    ],
    holidayNote: 'Cerrado en feriados nacionales. Las clases se reponen la semana siguiente.',
  },

  navigation: [
    { label: 'Inicio', segment: '' },
    { label: 'El estudio', segment: 'nosotros' },
    { label: 'Disciplinas', segment: 'servicios' },
    { label: 'Membresías', segment: 'planes', requiresFeature: 'showPlans' },
    { label: 'Espacios', segment: 'instalaciones', requiresFeature: 'showFacilities' },
    { label: 'Galería', segment: 'galeria', requiresFeature: 'showGallery' },
    { label: 'Horarios', segment: 'horarios', requiresFeature: 'showSchedule' },
    { label: 'Contacto', segment: 'contacto' },
  ],

  features: {
    ...DEFAULT_FEATURE_FLAGS,
    showTeam: false,
    showFaq: false,
    showLocationMap: false,
    showTestimonials: true,
  },

  seo: {
    title: 'Aurora Fit — Movimiento consciente, todos los días',
    titleTemplate: '%s · Aurora Fit',
    description:
      'Estudio boutique de bienestar en Cochabamba. Yoga, pilates reformer, movilidad y entrenamiento de fuerza en grupos reducidos.',
    keywords: ['yoga cochabamba', 'pilates reformer', 'estudio de bienestar', 'aurora fit', 'movilidad'],
    locale: 'es_BO',
  },

  provisioning: {
    plan: 'starter',
    activeSince: '2026-06-01',
    status: 'trial',
  },

  content: {
    hero: {
      eyebrow: 'Cochabamba · Estudio boutique',
      title: 'Un espacio para',
      titleAccent: 'volver al cuerpo',
      subtitle:
        'Grupos de máximo diez personas, luz natural y profesoras que se aprenden tu nombre en la primera semana. Sin espejos de pared a pared ni música a todo volumen.',
      primaryCta: { label: 'Ver membresías', segment: 'planes' },
      secondaryCta: { label: 'Conocer el estudio', segment: 'nosotros' },
      stats: [
        { value: '10', label: 'personas por clase' },
        { value: '24', label: 'clases semanales' },
        { value: '4', label: 'disciplinas' },
        { value: '340', label: 'alumnas y alumnos' },
      ],
    },

    about: {
      eyebrow: 'El estudio',
      title: 'Nacimos de una pregunta incómoda',
      lead:
        '¿Por qué entrenar tenía que doler, apurar y competir? Aurora empezó en 2023 como respuesta a esa pregunta, en una sala prestada los martes por la tarde.',
      paragraphs: [
        'Hoy ocupamos una casa restaurada en la Recoleta, con tres salas y patio interno. Seguimos limitando las clases a diez personas porque es el número exacto en el que una profesora puede corregir a todo el mundo sin que nadie quede mirando desde el fondo.',
        'No medimos el progreso en kilos levantados. Lo medimos en si podés agacharte sin pensarlo, dormir mejor y sostener una práctica que no se abandona en marzo. Eso lleva más tiempo y no queda tan bien en una foto.',
        'Cada persona hace una clase de valoración antes de elegir disciplina. Nos interesa que entres en el grupo correcto desde el primer día, no que compres la membresía más cara.',
      ],
      values: [
        {
          title: 'Grupos pequeños, siempre',
          description: 'Diez personas es el límite. No lo movemos ni en temporada alta ni por conveniencia comercial.',
          icon: 'group',
        },
        {
          title: 'Técnica sobre intensidad',
          description: 'Preferimos que hagas menos y bien. La progresión llega sola cuando el movimiento está sano.',
          icon: 'yoga',
        },
        {
          title: 'Un ritmo sostenible',
          description: 'Diseñamos para que practiques diez años, no para que te agotes en diez semanas.',
          icon: 'heart',
        },
        {
          title: 'Espacios que acompañan',
          description: 'Luz natural, madera, plantas y silencio. El entorno también entrena.',
          icon: 'sparkle',
        },
      ],
      milestones: [
        { year: '2023', text: 'Primeras clases de yoga en una sala prestada, martes y jueves.' },
        { year: '2024', text: 'Alquilamos la casa de la Recoleta y sumamos pilates reformer.' },
        { year: '2025', text: 'Abrimos la sala de fuerza y movilidad en el patio techado.' },
        { year: '2026', text: '340 alumnas y alumnos activos, 24 clases semanales.' },
      ],
    },

    services: [
      {
        id: 'yoga',
        name: 'Yoga',
        summary: 'Vinyasa, hatha y restaurativo en salas con luz natural.',
        description:
          'Tres niveles y tres estilos a lo largo de la semana. Las clases restaurativas de los viernes por la tarde son el cierre que la mayoría de nuestras alumnas no se pierde.',
        icon: 'yoga',
        highlights: ['3 niveles', 'Material incluido', 'Clases de 60 y 75 minutos'],
      },
      {
        id: 'pilates',
        name: 'Pilates reformer',
        summary: 'Seis camas reformer, grupos de máximo seis personas.',
        description:
          'Trabajo de control, fuerza profunda y alineación. Es la disciplina más pedida para recuperación de lesiones lumbares y postparto, siempre con derivación médica previa.',
        icon: 'spa',
        highlights: ['6 camas reformer', 'Grupos de 6', 'Apto postparto con alta médica'],
      },
      {
        id: 'fuerza',
        name: 'Fuerza y movilidad',
        summary: 'Entrenamiento de fuerza con enfoque en rango de movimiento.',
        description:
          'Pesas libres, kettlebells y trabajo de movilidad articular. Para quien quiere ganar fuerza sin renunciar a moverse bien.',
        icon: 'dumbbell',
        highlights: ['Grupos de 10', 'Progresión escrita', 'Evaluación de movilidad inicial'],
      },
      {
        id: 'acompanamiento',
        name: 'Acompañamiento individual',
        summary: 'Sesiones uno a uno con seguimiento mensual.',
        description:
          'Para objetivos específicos, procesos de rehabilitación acompañados o simplemente para quien prefiere no practicar en grupo.',
        icon: 'trainer',
        highlights: ['Sesiones de 55 minutos', 'Informe mensual', 'Horario a convenir'],
      },
    ],

    planGroups: [
      {
        id: 'membresias',
        name: 'Membresías',
        description: 'Elegí con qué frecuencia querés practicar.',
        plans: [
          {
            id: 'clase-suelta',
            name: 'Clase suelta',
            tagline: 'Sin compromiso',
            price: 45,
            currency: 'Bs',
            period: 'diario',
            featured: false,
            features: [
              { label: 'Una clase de la disciplina que elijas', included: true },
              { label: 'Material incluido', included: true },
              { label: 'Reserva de cupo anticipada', included: true },
              { label: 'Valoración inicial', included: false },
              { label: 'Acceso a todas las disciplinas', included: false },
            ],
            ctaLabel: 'Reservar clase',
          },
          {
            id: 'esencial',
            name: 'Esencial',
            tagline: 'Dos clases por semana',
            price: 320,
            currency: 'Bs',
            period: 'mensual',
            featured: false,
            features: [
              { label: '8 clases al mes', included: true },
              { label: 'Una disciplina a elección', included: true },
              { label: 'Valoración inicial sin costo', included: true },
              { label: 'Reserva con 7 días de anticipación', included: true },
              { label: 'Pilates reformer', included: false },
              { label: 'Acompañamiento individual', included: false },
            ],
            ctaLabel: 'Elegir Esencial',
          },
          {
            id: 'completa',
            name: 'Completa',
            tagline: 'Practicá todos los días',
            price: 520,
            currency: 'Bs',
            period: 'mensual',
            compareAtPrice: 620,
            featured: true,
            badge: 'Recomendada',
            features: [
              { label: 'Clases ilimitadas', included: true },
              { label: 'Todas las disciplinas, incluido reformer', included: true },
              { label: 'Valoración y seguimiento trimestral', included: true },
              { label: 'Invitación para una amiga al mes', included: true },
              { label: 'Prioridad en lista de espera', included: true },
              { label: 'Acompañamiento individual', included: false },
            ],
            ctaLabel: 'Elegir Completa',
          },
          {
            id: 'anual',
            name: 'Aurora Anual',
            tagline: 'Doce meses, dos de regalo',
            price: 5200,
            currency: 'Bs',
            period: 'anual',
            featured: false,
            badge: 'Mejor valor',
            features: [
              { label: 'Todo lo de la membresía Completa', included: true },
              { label: 'Dos meses sin cargo', included: true },
              { label: '4 sesiones individuales al año', included: true },
              { label: 'Congelamiento de hasta 30 días', included: true },
              { label: 'Precio congelado durante 12 meses', included: true },
            ],
            ctaLabel: 'Hablar con el estudio',
          },
        ],
      },
    ],
    products: [],

    plansNote:
      'La clase de valoración es sin costo y no obliga a contratar. Las membresías mensuales se renuevan el mismo día de cada mes y se pueden pausar avisando con una semana de anticipación.',

    facilities: [
      {
        id: 'sala-luz',
        name: 'Sala de luz',
        description:
          'La sala principal de yoga, con ventanales al patio y piso de madera. Sin espejos: la atención va hacia adentro, no hacia el reflejo.',
        area: '65 m²',
        icon: 'yoga',
        stats: [
          { label: 'Capacidad', value: '10' },
          { label: 'Piso', value: 'Madera' },
          { label: 'Luz natural', value: 'Todo el día' },
        ],
      },
      {
        id: 'sala-reformer',
        name: 'Sala reformer',
        description:
          'Seis camas reformer con torre completa, climatizada y con acceso independiente para quien llega de una sesión de rehabilitación.',
        area: '48 m²',
        icon: 'spa',
        stats: [
          { label: 'Camas', value: '6' },
          { label: 'Grupos de', value: '6' },
          { label: 'Climatizada', value: 'Sí' },
        ],
      },
      {
        id: 'patio',
        name: 'Patio techado',
        description:
          'El área de fuerza y movilidad, semiabierta y con vegetación. Se entrena al aire libre sin depender del clima.',
        area: '80 m²',
        icon: 'dumbbell',
        stats: [
          { label: 'Semiabierto', value: 'Sí' },
          { label: 'Kettlebells', value: '4–28 kg' },
          { label: 'Capacidad', value: '10' },
        ],
      },
      {
        id: 'estar',
        name: 'Sala de estar',
        description:
          'Un espacio para quedarse después de clase: té, agua filtrada y sillones. La mitad de la comunidad se formó acá, no en las salas.',
        area: '30 m²',
        icon: 'sparkle',
        stats: [
          { label: 'Té e infusiones', value: 'Libre' },
          { label: 'Wi-Fi', value: 'Sí' },
          { label: 'Casilleros', value: '40' },
        ],
      },
    ],

    gallery: [
      { id: 'g1', title: 'Sala de luz', caption: 'Clase de vinyasa de la mañana', span: 2, seed: 5 },
      { id: 'g2', title: 'Reformer', caption: 'Grupos de seis personas', span: 1, seed: 19 },
      { id: 'g3', title: 'Patio techado', caption: 'Fuerza y movilidad', span: 1, seed: 33 },
      { id: 'g4', title: 'Detalle', caption: 'Madera, plantas y luz', span: 1, seed: 47 },
      { id: 'g5', title: 'Sala de estar', caption: 'Después de la práctica', span: 2, seed: 61 },
      { id: 'g6', title: 'Entrada', caption: 'Casa restaurada en la Recoleta', span: 1, seed: 88 },
    ],

    team: [],

    testimonials: [
      {
        id: 'ts1',
        quote:
          'Probé tres estudios antes de llegar acá. La diferencia es que en Aurora te miran. Nadie corrige a diez personas a la vez sin que se note.',
        author: 'Lucía T.',
        context: 'Alumna desde 2024 · Membresía Completa',
        rating: 5,
      },
      {
        id: 'ts2',
        quote:
          'Llegué con una hernia lumbar y mucho miedo. Un año de reformer después vuelvo a cargar a mi hija sin pensarlo.',
        author: 'Fernanda R.',
        context: 'Alumna desde 2025 · Pilates reformer',
        rating: 5,
      },
      {
        id: 'ts3',
        quote:
          'Es el único lugar donde llego apurado y me voy tranquilo. Y encima gané fuerza, que era lo que menos esperaba.',
        author: 'Joaquín B.',
        context: 'Alumno desde 2025 · Fuerza y movilidad',
        rating: 5,
      },
    ],

    faq: [],

    closingCta: {
      title: 'Tu clase de valoración es gratuita',
      subtitle:
        'Vení, practicá y conversá con nosotras. Después vemos qué disciplina y qué ritmo te corresponden.',
      label: 'Reservar mi valoración',
    },
  },
};
