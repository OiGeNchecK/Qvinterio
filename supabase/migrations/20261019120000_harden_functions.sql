-- Trigger functions are never called through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.order_default_assignee() from public, anon, authenticated;
revoke execute on function public.log_order_status() from public, anon, authenticated;

-- Access helpers are needed by signed-in users' policies; anon only needs
-- is_staff() for the public portfolio policy.
revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.client_can_view(uuid) from public, anon;
revoke execute on function public.can_view_project(uuid) from public, anon;
revoke execute on function public.can_work_on_project(uuid) from public, anon;
