// Idempotent schema, applied automatically on first request after a cold start.
// Row level security is enabled with no policies so the tables are NOT readable
// through Supabase's public REST API; the app connects as the table owner.
export const SCHEMA_SQL = `
create table if not exists categories (
  id serial primary key,
  kind text not null check (kind in ('expense','income')),
  name text not null,
  icon text not null default '',
  sort integer not null default 0
);
create table if not exists people (
  id serial primary key,
  name text not null unique
);
create table if not exists events (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists transactions (
  id serial primary key,
  kind text not null check (kind in ('expense','income')),
  amount integer not null check (amount > 0),
  date date not null,
  time text check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  category_id integer references categories(id) on delete set null,
  event_id integer references events(id) on delete set null,
  method text,
  note text not null default '',
  place_name text,
  place_address text,
  lat double precision,
  lng double precision,
  receipt_path text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on transactions(date);
create table if not exists transaction_people (
  transaction_id integer not null references transactions(id) on delete cascade,
  person_id integer not null references people(id) on delete cascade,
  primary key (transaction_id, person_id)
);
create table if not exists login_attempts (
  id serial primary key,
  ip text not null,
  at timestamptz not null default now()
);
alter table categories enable row level security;
alter table people enable row level security;
alter table events enable row level security;
alter table transactions enable row level security;
alter table transaction_people enable row level security;
alter table login_attempts enable row level security;
`;

export const DEFAULT_CATEGORIES: { kind: "expense" | "income"; name: string; icon: string }[] = [
  { kind: "expense", name: "Food", icon: "🍚" },
  { kind: "expense", name: "Cafe", icon: "☕" },
  { kind: "expense", name: "Drinks", icon: "🍻" },
  { kind: "expense", name: "Transport", icon: "🚌" },
  { kind: "expense", name: "Shopping", icon: "🛍️" },
  { kind: "expense", name: "Housing", icon: "🏠" },
  { kind: "expense", name: "Bills", icon: "📱" },
  { kind: "expense", name: "Health", icon: "💊" },
  { kind: "expense", name: "Leisure", icon: "🎬" },
  { kind: "expense", name: "Gifts", icon: "🎁" },
  { kind: "expense", name: "Other", icon: "📦" },
  { kind: "income", name: "Salary", icon: "💼" },
  { kind: "income", name: "Bonus", icon: "💰" },
  { kind: "income", name: "Interest", icon: "🏦" },
  { kind: "income", name: "Gift", icon: "🎁" },
  { kind: "income", name: "Other", icon: "📦" },
];
