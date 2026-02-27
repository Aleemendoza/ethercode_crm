export type Lead = {
  id: string;
  name: string;
  company: string;
  status: "nuevo" | "contactado" | "propuesta" | "ganado";
  aiScore: number;
  estimatedValue: number;
  urgency: "baja" | "media" | "alta";
  source: string;
  updatedAt: string;
};

export const leads: Lead[] = [
  { id: "L-101", name: "María Torres", company: "Gym Atlas", status: "nuevo", aiScore: 78, estimatedValue: 1200, urgency: "alta", source: "web", updatedAt: "hace 5 min" },
  { id: "L-102", name: "Luis Paredes", company: "InmoRápida", status: "contactado", aiScore: 64, estimatedValue: 3000, urgency: "media", source: "whatsapp", updatedAt: "hace 24 min" },
  { id: "L-103", name: "Sofía Melo", company: "Resto Norte", status: "propuesta", aiScore: 85, estimatedValue: 4500, urgency: "alta", source: "referido", updatedAt: "hace 1 h" },
  { id: "L-104", name: "Carlos Ruiz", company: "Dental Plus", status: "ganado", aiScore: 91, estimatedValue: 5200, urgency: "media", source: "landing", updatedAt: "hace 2 h" }
];

export const metrics = {
  potentialValue: 13900,
  conversionRate: 28,
  averageScore: 79,
  avgResponseHours: 1.7
};

export const automations = [
  { id: "A-1", name: "Score > 70 crea tarea", active: true },
  { id: "A-2", name: "Lead caliente sin respuesta -> urgente", active: true },
  { id: "A-3", name: "WhatsApp entrante etiqueta objeción", active: false }
];
