// Database Types
export interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  mfa_enabled: boolean;
  created_at: string;
}

export interface WhatsAppNumber {
  id: string;
  tenant_id: string;
  wa_number: string;
  session_id?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  label?: string;
  persona_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  tenant_id: string;
  base_url: string;
  token_hash: string;
  last_qr?: string;
  last_seen?: string;
  webhook_secret: string;
  number_id: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id?: string;
  from_number_id?: string;
  to_number_id?: string;
  wa_msg_id?: string;
  direction: 'in' | 'out';
  body?: string;
  meta: Record<string, any>;
  status: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  name: string;
  mode: string;
  active: boolean;
  openai_model: string;
  temperature: number;
}

export interface Persona {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  greeting_morning?: string;
  greeting_afternoon?: string;
  greeting_evening?: string;
  style_notes?: string;
  created_at: string;
}

// API Types
export interface CreateInstanceRequest {
  label: string;
  persona_id?: string;
}

export interface CreateInstanceResponse {
  session_id: string;
  qr_code: string;
}

export interface WebhookEvent {
  event: string;
  instance: string;
  data: any;
}

export interface OutreachPolicy {
  number_id: string;
  daily_limit: number;
  hourly_limit: number;
  dayparts: ('morning' | 'afternoon' | 'evening')[];
}

// Queue Job Types
export interface GenerateReplyJob {
  messageId: string;
  conversationId: string;
  fromNumberId: string;
  toNumberId: string;
  context: string;
  personaId?: string;
}

export interface SendMessageJob {
  toNumberId: string;
  content: string;
  messageId: string;
  delay?: number;
}

export interface ConversationScheduleJob {
  conversationId: string;
  roundId: string;
}

export interface OutreachJob {
  contactId: string;
  numberIds: string[];
  templateId?: string;
  campaignId?: string;
}

// Configuration Types
export interface ConversationSchedule {
  day: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  morning_enabled: boolean;
  morning_window: { start: string; end: string };
  afternoon_enabled: boolean;
  afternoon_window: { start: string; end: string };
  evening_enabled: boolean;
  evening_window: { start: string; end: string };
  max_rounds_per_window: number;
  pause_between_rounds_min: number;
  pause_between_rounds_max: number;
}

export interface GlobalSettings {
  tenant_id: string;
  min_delay_seconds: number;
  max_delay_seconds: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  daily_message_limit: number;
  hourly_burst_limit: number;
  enable_bot_to_bot: boolean;
  enable_humanization: boolean;
  enable_anti_echo: boolean;
}

// Evolution API Types
export interface EvolutionInstance {
  instanceName: string;
  status: 'open' | 'connecting' | 'connected' | 'disconnected';
}

export interface EvolutionQRResponse {
  qrcode: string;
}

export interface EvolutionMessageRequest {
  number: string;
  text: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageTimestamp?: number;
    status?: string;
  };
}

// Metrics Types
export interface MessageStats {
  date: string;
  tenant_id: string;
  direction: 'in' | 'out';
  message_count: number;
  unique_senders: number;
}

export interface NumberStats {
  date: string;
  number_id: string;
  messages_sent: number;
  messages_received: number;
  conversations_active: number;
  outreach_sent: number;
}

export interface ConversationStats {
  date: string;
  conversation_id: string;
  rounds_completed: number;
  avg_round_duration: number;
  total_messages: number;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Dashboard Types
export interface DashboardStats {
  total_instances: number;
  active_instances: number;
  messages_today: number;
  messages_7d: number;
  avg_response_time: number;
  success_rate: number;
}

export interface InstanceCard {
  id: string;
  label: string;
  wa_number: string;
  status: WhatsAppNumber['status'];
  messages_today: number;
  messages_7d: number;
  last_activity?: string;
  persona_name?: string;
}

// Form Types
export interface CreateConversationForm {
  name: string;
  participant_ids: string[];
  topic_ids: string[];
  schedule: ConversationSchedule[];
  max_rounds: number;
  openai_model: string;
  temperature: number;
}

export interface CreatePersonaForm {
  name: string;
  description?: string;
  system_prompt: string;
  greeting_morning?: string;
  greeting_afternoon?: string;
  greeting_evening?: string;
  style_notes?: string;
}

export interface OutreachPolicyForm {
  number_id: string;
  daily_limit: number;
  hourly_limit: number;
  max_rounds_per_contact: number;
  min_gap_minutes: number;
  dayparts: ('morning' | 'afternoon' | 'evening')[];
  allow_days: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[];
  optout_keywords: string[];
}