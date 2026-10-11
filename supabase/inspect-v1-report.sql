-- Style2fit — database report (read-only). Run in Supabase → SQL Editor.
-- The first line only asks the API to refresh its list of tables; nothing is changed.
notify pgrst, 'reload schema';

select jsonb_pretty(jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'rows', (xpath('/row/n/text()',
                query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text::bigint,
      'rls_enabled', c.relrowsecurity,
      'columns', (
        select jsonb_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
                         || case when a.attnotnull then ' not null' else '' end order by a.attnum)
        from pg_attribute a
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)
    ) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'policy', policyname, 'command', cmd,
      'roles', to_jsonb(roles), 'using', qual, 'check', with_check) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'),
  'functions', (
    select coalesce(jsonb_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')' order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', event_object_schema || '.' || event_object_table, 'trigger', trigger_name,
      'when', action_timing || ' ' || event_manipulation, 'action', action_statement)), '[]'::jsonb)
    from information_schema.triggers where event_object_schema in ('public', 'auth')),
  'enums', (
    select coalesce(jsonb_agg(t.typname || ': ' || (
      select string_agg(e.enumlabel, ', ' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)), '[]'::jsonb)
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'),
  'tables_in_other_schemas', (
    select coalesce(jsonb_agg(distinct table_schema || '.' || table_name), '[]'::jsonb)
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and table_schema not in ('pg_catalog', 'information_schema', 'public', 'auth', 'storage', 'realtime',
                               'supabase_functions', 'extensions', 'graphql', 'graphql_public', 'vault',
                               'pgsodium', 'pgsodium_masks', 'net', 'supabase_migrations', 'cron', '_realtime',
                               '_analytics', 'pgbouncer'))
)) as style2fit_report;
