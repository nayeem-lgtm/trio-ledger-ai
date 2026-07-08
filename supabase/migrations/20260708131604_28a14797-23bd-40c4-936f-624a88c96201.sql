
create policy "brand-assets read for authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'brand-assets');

create policy "brand-assets owner insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand-assets owner update"
on storage.objects for update to authenticated
using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "brand-assets owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = auth.uid()::text);
