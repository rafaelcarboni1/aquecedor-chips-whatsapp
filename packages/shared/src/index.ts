import { z } from 'zod';
import type { 
  CreateInstanceRequest, 
  OutreachPolicy, 
  ConversationSchedule,
  GlobalSettings,
  CreateConversationForm,
  CreatePersonaForm,
  OutreachPolicyForm
} from '@mirage/types';

// Validation Schemas
export const createInstanceSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  persona_id: z.string().uuid().optional()
}) satisfies z.ZodType<CreateInstanceRequest>;

export const outreachPolicySchema = z.object({
  number_id: z.string().uuid(),
  daily_limit: z.number().min(1).max(200),
  hourly_limit: z.number().min(1).max(50),
  dayparts: z.array(z.enum(['morning', 'afternoon', 'evening'])).min(1)
}) satisfies z.ZodType<OutreachPolicy>;

export const conversationScheduleSchema = z.object({
  day: z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
  morning_enabled: z.boolean(),
  morning_window: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  afternoon_enabled: z.boolean(),
  afternoon_window: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  evening_enabled: z.boolean(),
  evening_window: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  max_rounds_per_window: z.number().min(1).max(20),
  pause_between_rounds_min: z.number().min(5),
  pause_between_rounds_max: z.number().min(10)
}) satisfies z.ZodType<ConversationSchedule>;

export const globalSettingsSchema = z.object({
  tenant_id: z.string().uuid(),
  min_delay_seconds: z.number().min(5).max(300),
  max_delay_seconds: z.number().min(30).max(600),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/),
  daily_message_limit: z.number().min(10).max(1000),
  hourly_burst_limit: z.number().min(5).max(100),
  enable_bot_to_bot: z.boolean(),
  enable_humanization: z.boolean(),
  enable_anti_echo: z.boolean()
}) satisfies z.ZodType<GlobalSettings>;

export const createConversationSchema = z.object({
  name: z.string().min(1).max(100),
  participant_ids: z.array(z.string().uuid()).min(2),
  topic_ids: z.array(z.string().uuid()).min(1),
  schedule: z.array(conversationScheduleSchema),
  max_rounds: z.number().min(1).max(50),
  openai_model: z.enum(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']),
  temperature: z.number().min(0).max(2)
}) satisfies z.ZodType<CreateConversationForm>;

export const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().min(10).max(2000),
  greeting_morning: z.string().max(200).optional(),
  greeting_afternoon: z.string().max(200).optional(),
  greeting_evening: z.string().max(200).optional(),
  style_notes: z.string().max(1000).optional()
}) satisfies z.ZodType<CreatePersonaForm>;

export const outreachPolicyFormSchema = z.object({
  number_id: z.string().uuid(),
  daily_limit: z.number().min(1).max(200),
  hourly_limit: z.number().min(1).max(50),
  max_rounds_per_contact: z.number().min(1).max(10),
  min_gap_minutes: z.number().min(15).max(1440),
  dayparts: z.array(z.enum(['morning', 'afternoon', 'evening'])).min(1),
  allow_days: z.array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).min(1),
  optout_keywords: z.array(z.string()).default(['pare', 'stop', 'sair', 'cancelar'])
}) satisfies z.ZodType<OutreachPolicyForm>;

// Utility Functions
export const formatPhoneNumber = (number: string): string => {
  // Remove all non-digits
  const digits = number.replace(/\D/g, '');
  
  // Format as Brazilian number if it looks like one
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  
  // Return with + prefix if it doesn't have one
  return digits.startsWith('+') ? digits : `+${digits}`;
};

export const isWithinTimeWindow = (start: string, end: string, now: Date = new Date()): boolean => {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  const startTime = new Date(now);
  startTime.setHours(startHour, startMin, 0, 0);
  
  const endTime = new Date(now);
  endTime.setHours(endHour, endMin, 0, 0);
  
  // Handle overnight windows (e.g., 22:00 - 06:00)
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  return now >= startTime && now <= endTime;
};

export const getDaypart = (date: Date = new Date()): 'morning' | 'afternoon' | 'evening' => {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

export const generateRandomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const isQuietHours = (quietStart: string, quietEnd: string, now: Date = new Date()): boolean => {
  return isWithinTimeWindow(quietStart, quietEnd, now);
};

export const sanitizeMessage = (message: string): string => {
  // Remove potential harmful content
  return message
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 1000); // Limit message length
};

export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const parseWhatsAppNumber = (number: string): string => {
  // Extract digits and ensure it's in international format
  const digits = number.replace(/\D/g, '');
  
  // Add country code if missing (assume Brazil)
  if (digits.length === 11 && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  
  return digits;
};

export const isValidWhatsAppNumber = (number: string): boolean => {
  const digits = parseWhatsAppNumber(number);
  return digits.length >= 10 && digits.length <= 15;
};

export const createApiResponse = <T>(data: T, success: boolean = true) => {
  return {
    success,
    data,
    timestamp: new Date().toISOString()
  };
};

export const createApiError = (code: string, message: string, details?: any) => {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
};

// Constants
export const HUMAN_DELAYS = {
  min: 15000, // 15 seconds
  max: 180000, // 3 minutes
  typing: [2000, 8000] // 2-8 seconds
} as const;

export const DAILY_LIMITS = {
  messages_per_number: 50,
  new_conversations: 10,
  outreach_contacts: 20
} as const;

export const OPT_OUT_KEYWORDS = [
  'pare', 'stop', 'sair', 'cancelar', 'remover',
  'não quero', 'desinscrever', 'spam'
] as const;

export const OPENAI_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-3.5-turbo'
] as const;

export const DAYPARTS = ['morning', 'afternoon', 'evening'] as const;

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const USER_ROLES = ['admin', 'operator', 'viewer'] as const;

export const NUMBER_STATUSES = ['disconnected', 'connecting', 'connected', 'error'] as const;

export const MESSAGE_DIRECTIONS = ['in', 'out'] as const;

// Type Guards
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^\d{2}:\d{2}$/;
  return timeRegex.test(time);
};

// Date Utilities
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 3600000);
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 86400000);
};

// Export all schemas for easy access
export const schemas = {
  createInstance: createInstanceSchema,
  outreachPolicy: outreachPolicySchema,
  conversationSchedule: conversationScheduleSchema,
  globalSettings: globalSettingsSchema,
  createConversation: createConversationSchema,
  createPersona: createPersonaSchema,
  outreachPolicyForm: outreachPolicyFormSchema
} as const;