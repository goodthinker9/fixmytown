-- Promote an existing user to admin. Run this in the Supabase SQL Editor.
-- Replace the email with the user you want to make an admin.
update users
set role = 'admin'
where email = 'your-email@example.com';

-- Verify the change:
-- select email, role from users where email = 'your-email@example.com';

-- To revoke admin again later:
-- update users set role = 'resident' where email = 'your-email@example.com';
