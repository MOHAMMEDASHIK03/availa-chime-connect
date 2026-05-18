
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

create policy "users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('makeup','hair')),
  name text not null,
  price numeric not null default 0,
  img text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.services enable row level security;

create policy "anyone can read services" on public.services for select using (true);
create policy "admins insert services" on public.services for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admins update services" on public.services for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins delete services" on public.services for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();

insert into public.services (category, name, price, img, description, sort_order) values
('makeup','Simple Makeup',80,'','Effortless everyday radiance — fresh skin, softly defined eyes and a hint of colour for that natural glow.',1),
('makeup','Bridal Makeup',350,'','An unforgettable bridal look crafted to last from first look to final dance, beautifully tailored to you.',2),
('makeup','HD Makeup',220,'','High-definition artistry with airbrush perfection — flawless on camera and in person, every angle.',3),
('makeup','Glossy Makeup',180,'','Glass-skin luminosity with glossy lips — a dewy, modern Aussie editorial finish that lights up the room.',4),
('makeup','Soft Glam Makeup',200,'','Romantic, sculpted soft glam — wearable luxury for engagements, soirées and special occasions.',5),
('hair','Soft Curls',70,'','Voluminous Hollywood waves with bounce and shine for a timeless feminine finish.',1),
('hair','Straightening',90,'','Silky, mirror-smooth strands with weightless movement and salon-grade gloss.',2),
('hair','Bridal Hairstyle',250,'','Bespoke bridal hair artistry — braided, pinned and adorned to crown your wedding day.',3),
('hair','Hair Updo',120,'','An elegant chignon or twisted updo, perfectly polished for galas and black-tie events.',4);

-- Gallery
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  img text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gallery_images enable row level security;
create policy "anyone can read gallery" on public.gallery_images for select using (true);
create policy "admins insert gallery" on public.gallery_images for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admins update gallery" on public.gallery_images for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins delete gallery" on public.gallery_images for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Bookings (no user account required)
create type public.booking_status as enum ('pending','confirmed','declined');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default '',
  phone text not null,
  services jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  booking_date date not null,
  booking_time text not null,
  location_type text not null check (location_type in ('studio','home')),
  address text not null default '',
  status public.booking_status not null default 'pending',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

-- Anyone (including anon) can create a booking
create policy "anyone can create bookings" on public.bookings for insert to anon, authenticated with check (true);
-- Anyone with the booking id can read it (id is the secret token)
create policy "anyone can read bookings" on public.bookings for select to anon, authenticated using (true);
-- Only admins can update / delete
create policy "admins update bookings" on public.bookings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins delete bookings" on public.bookings for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

-- Realtime
alter publication supabase_realtime add table public.services;
alter table public.services replica identity full;
alter publication supabase_realtime add table public.bookings;
alter table public.bookings replica identity full;
alter publication supabase_realtime add table public.gallery_images;
alter table public.gallery_images replica identity full;

-- Admin auto-grant on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = lower('Kiruthikak402@gmail.com') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Storage bucket for site images (services + gallery)
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

create policy "Public can read site-images"
  on storage.objects for select
  using (bucket_id = 'site-images');

create policy "Admins can upload site-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.has_role(auth.uid(),'admin'));

create policy "Admins can update site-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and public.has_role(auth.uid(),'admin'));

create policy "Admins can delete site-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and public.has_role(auth.uid(),'admin'));
