--Documents Table

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  status text NOT NULL,
  analysis_results text NULL,
  risk_level text NULL,
  model_used text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  score integer NULL,
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
) TABLESPACE pg_default;

--Subscriptions Table
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid NOT NULL,
  status public.subscription_status NULL,
  price_id text NULL,
  quantity integer NULL,
  cancel_at_period_end boolean NULL,
  created timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_start timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_end timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  cancel_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  canceled_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  trial_start timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  trial_end timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
) TABLESPACE pg_default;

--Users Table

CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text NULL,
  avatar_url text NULL,
  billing_address jsonb NULL,
  payment_method jsonb NULL,
  credits integer NULL DEFAULT 1,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
) TABLESPACE pg_default;

--Handle New User Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql;

--Handle Subscription Change Function
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- Update user credits to 20 for new active subscriptions
    UPDATE public.users
    SET credits = 20
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- RLS Policies
--Can view own user data
CREATE POLICY "Can view own user data." ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

--Can update own user data
CREATE POLICY "Can update own user data." ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

--Users can only see their own documents
CREATE POLICY "Users can only see their own documents." ON public.documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

--Can view own subscriptions
CREATE POLICY "Can view own subscriptions." ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
