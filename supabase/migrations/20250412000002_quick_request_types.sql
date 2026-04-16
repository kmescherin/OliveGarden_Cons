-- Add quick request types from resident feedback

insert into public.service_types (key, name, description, sort_order)
values
  ('water_on', 'Turn on water', 'Request to enable water supply', 3),
  ('water_off', 'Turn off water', 'Request to disable water supply', 4),
  ('elevator_broken', 'Elevator broken', 'Urgent: elevator malfunction', 5),
  ('cleaning', 'Cleaning request', 'Common area cleaning', 6)
on conflict (key) do nothing;
