UPDATE normative_documents
   SET status = 'needs_confirmation',
       notes = CASE
         WHEN notes LIKE '%Требуется официально подтвердить актуальность.%' THEN notes
         ELSE trim(notes || ' Требуется официально подтвердить актуальность.')
       END,
       updated_at = now()
 WHERE code IN (
   'NOV-MZ-1360-D-2023',
   'NOV-MZ-1134-D-2023',
   'NOV-MZ-409-D-2023',
   'NOV-MZ-792-D-2024',
   'NOV-MZ-718-D-2024',
   'NOV-MZ-1424-D-2025',
   'NOV-MZ-1180-D-2025'
 )
   AND verified_at IS NULL
   AND official_url IS NULL;
