
-- Create libraries table
CREATE TABLE public.libraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PDFs table
CREATE TABLE public.pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_id UUID REFERENCES public.libraries ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  library_id UUID REFERENCES public.libraries ON DELETE CASCADE,
  pdf_id UUID REFERENCES public.pdfs ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  source_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for libraries
CREATE POLICY "Users can view their own libraries" ON public.libraries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own libraries" ON public.libraries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own libraries" ON public.libraries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own libraries" ON public.libraries FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for PDFs
CREATE POLICY "Users can view their own PDFs" ON public.pdfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own PDFs" ON public.pdfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own PDFs" ON public.pdfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own PDFs" ON public.pdfs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for chat sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for chat messages
CREATE POLICY "Users can view messages from their chat sessions" ON public.chat_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = session_id AND chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users can create messages in their chat sessions" ON public.chat_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = session_id AND chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users can update messages in their chat sessions" ON public.chat_messages FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = session_id AND chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete messages from their chat sessions" ON public.chat_messages FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE chat_sessions.id = session_id AND chat_sessions.user_id = auth.uid()));

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Storage policies for PDFs bucket
CREATE POLICY "Users can upload their own PDFs" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own PDFs" ON storage.objects FOR SELECT 
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own PDFs" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs" ON storage.objects FOR DELETE 
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
