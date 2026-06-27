
CREATE TABLE public.user_ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable','openai','gemini')),
  openai_api_key TEXT,
  gemini_api_key TEXT,
  openai_model TEXT DEFAULT 'gpt-4o-mini',
  gemini_model TEXT DEFAULT 'gemini-2.0-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_settings TO authenticated;
GRANT ALL ON public.user_ai_settings TO service_role;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own ai settings" ON public.user_ai_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_ai_settings_touch BEFORE UPDATE ON public.user_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
