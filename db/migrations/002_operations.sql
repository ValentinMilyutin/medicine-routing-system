CREATE TABLE IF NOT EXISTS feedback_recipients (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  label text NOT NULL DEFAULT '' CHECK (length(label) <= 160),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feedback_recipients_email_unique
  ON feedback_recipients (lower(email));

CREATE TABLE IF NOT EXISTS routing_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category text NOT NULL CHECK (
    category IN ('routing_error', 'address_outdated', 'document_outdated', 'suggestion', 'other')
  ),
  message text NOT NULL CHECK (length(message) BETWEEN 10 AND 4000),
  profile_id text CHECK (
    profile_id IS NULL OR profile_id IN ('obgyn', 'oncology', 'bsk', 'dermatology', 'infectious', 'road_accident')
  ),
  content_version text,
  result_id text,
  rule_id text,
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'in_progress', 'resolved', 'rejected')
  ),
  admin_note text NOT NULL DEFAULT '' CHECK (length(admin_note) <= 4000),
  notification_status text NOT NULL DEFAULT 'pending' CHECK (
    notification_status IN ('pending', 'sent', 'not_configured', 'failed')
  ),
  notification_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routing_feedback_status_created
  ON routing_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS routing_feedback_profile_created
  ON routing_feedback (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS normative_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]{2,79}$'),
  title text NOT NULL CHECK (length(title) BETWEEN 5 AND 1000),
  issuer text NOT NULL CHECK (length(issuer) BETWEEN 3 AND 500),
  document_number text NOT NULL CHECK (length(document_number) BETWEEN 1 AND 100),
  issued_on date,
  status text NOT NULL DEFAULT 'needs_confirmation' CHECK (
    status IN ('active', 'needs_confirmation', 'expired', 'replaced', 'archived')
  ),
  official_url text,
  storage_provider text CHECK (
    storage_provider IS NULL OR storage_provider IN ('vercel_blob', 'external')
  ),
  storage_key text,
  file_url text,
  download_url text,
  original_filename text,
  mime_type text,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes > 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  notes text NOT NULL DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normative_documents_status_date
  ON normative_documents (status, issued_on DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS normative_document_references (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES normative_documents(id) ON DELETE RESTRICT,
  profile_id text NOT NULL CHECK (
    profile_id IN ('obgyn', 'oncology', 'bsk', 'dermatology', 'infectious', 'road_accident')
  ),
  source_id text,
  branch_id text,
  reference_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normative_references_profile
  ON normative_document_references (profile_id, document_id);

CREATE UNIQUE INDEX IF NOT EXISTS normative_references_logical_unique
  ON normative_document_references (
    document_id,
    profile_id,
    COALESCE(source_id, ''),
    COALESCE(branch_id, '')
  );

CREATE TABLE IF NOT EXISTS normative_document_relations (
  parent_document_id bigint NOT NULL REFERENCES normative_documents(id) ON DELETE RESTRICT,
  related_document_id bigint NOT NULL REFERENCES normative_documents(id) ON DELETE RESTRICT,
  relation_type text NOT NULL CHECK (
    relation_type IN ('amends', 'replaces', 'supplements')
  ),
  PRIMARY KEY (parent_document_id, related_document_id, relation_type),
  CHECK (parent_document_id <> related_document_id)
);

CREATE TABLE IF NOT EXISTS usage_daily_stats (
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  profile_id text NOT NULL CHECK (
    profile_id IN ('obgyn', 'oncology', 'bsk', 'dermatology', 'infectious', 'road_accident')
  ),
  content_version text NOT NULL DEFAULT '',
  event_type text NOT NULL CHECK (
    event_type IN ('profile_opened', 'route_completed', 'document_opened', 'feedback_submitted')
  ),
  dimension text NOT NULL DEFAULT '',
  event_count bigint NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (event_date, profile_id, content_version, event_type, dimension)
);

CREATE TABLE IF NOT EXISTS operations_admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area text NOT NULL CHECK (area IN ('feedback', 'recipient', 'document')),
  entity_id bigint,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'admin' CHECK (actor = 'admin'),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operations_audit_created
  ON operations_admin_audit_log (created_at DESC);

INSERT INTO normative_documents (
  code, title, issuer, document_number, issued_on, status,
  original_filename, mime_type, size_bytes, sha256, notes
) VALUES
  (
    'NOV-MZ-1360-D-2023',
    'Об организации оказания медицинской помощи пострадавшим при дорожно-транспортных происшествиях, произошедших на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '1360-Д', DATE '2023-11-21', 'active', 'ДТП.pdf', 'application/pdf', 6211166,
    '2e2ead54a1359f7f77795b935e52d905d3bf749a6cc66cabe7f94fb625f423f8',
    'Предоставленная копия; файл сканированный, без текстового слоя.'
  ),
  (
    'NOV-MZ-400-D-2024',
    'Об организации оказания медицинской помощи взрослому населению с сердечно-сосудистыми заболеваниями на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '400-Д', DATE '2024-04-18', 'needs_confirmation', 'Сердечно-сосудистые.pdf', 'application/pdf', 2845034,
    '4c786e177caf198a9ee2b3e84d82c4bd2ef9cb0531205e1f2eb8f60e7624ab25',
    'Требуется сопоставить с указанным в текущем профиле приказом № 1368-Д.'
  ),
  (
    'NOV-MZ-1134-D-2023',
    'Об оказании медицинской помощи взрослому населению по профилю «травматология и ортопедия» на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '1134-Д', DATE '2023-10-19', 'active', 'Травматология и ортопедия.pdf', 'application/pdf', 3905716,
    '562375d756cb0688e338bcb6510db587bd65be26fe4de713880d2bb49d4d17aa',
    'Предоставленная копия; файл сканированный, без текстового слоя.'
  ),
  (
    'NOV-MZ-409-D-2023',
    'Об организации работы по оказанию медицинской помощи взрослому населению по профилю «хирургия» на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '409-Д', DATE '2023-04-21', 'active', 'Хирургия.pdf', 'application/pdf', 962189,
    'd9813b850e67b8fa333aea31c58f3fe4009aa1fa925dd81a3700ca06f80d6bcf',
    'Предоставленная копия; файл сканированный, без текстового слоя.'
  ),
  (
    'NOV-MZ-792-D-2024',
    'Об организации гинекологической помощи на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '792-Д', DATE '2024-08-05', 'active', '792-Д от 05.08.2024.pdf', 'application/pdf', 1071158,
    'be59cbd030089687bd061840f722da2ddd5a83dfd975c541b3b1a1f570a909c1',
    'Предоставленная копия; файл сканированный, без текстового слоя.'
  ),
  (
    'NOV-MZ-718-D-2024',
    'Об организации медицинской помощи женщинам в период беременности, родов и после родов в медицинских организациях Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '718-Д', DATE '2024-07-16', 'active', 'аиг (актуальный).docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 188398,
    '2ebc1592582440e746cea049c53ac191649401d297ac57d23c9f600fa5e675e1',
    'Основной документ акушерского профиля в предоставленной редакции.'
  ),
  (
    'NOV-MZ-1424-D-2025',
    'О внесении изменения в приказ Министерства здравоохранения Новгородской области от 16.07.2024 № 718-Д',
    'Министерство здравоохранения Новгородской области',
    '1424-Д', DATE '2025-12-08', 'active', 'АиГ.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 103771,
    '88ccabb0c1d80f23e99c454fd18ffd6d2585312de2bd329df42a5568906b9b97',
    'Изменяет схему маршрутизации, утверждённую приказом № 718-Д.'
  ),
  (
    'NOV-MZ-1180-D-2025',
    'Об организации медицинской помощи по профилю «онкология» на территории Новгородской области',
    'Министерство здравоохранения Новгородской области',
    '1180-Д', DATE '2025-10-30', 'active', 'Онко.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 113806,
    '3b1b21b771d4f332f621f481e86c13e12d4ffe04fc49879c72340ac182d0db9e',
    'Предоставленный действующий региональный документ онкологического профиля.'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'road_accident', 'novgorod-1360-d', NULL, 'Основной приказ профиля ДТП'
  FROM normative_documents WHERE code = 'NOV-MZ-1360-D-2023'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'obgyn', 'novgorod-792-d', 'gynecology', 'Гинекологическая маршрутизация'
  FROM normative_documents WHERE code = 'NOV-MZ-792-D-2024'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'obgyn', 'novgorod-718-d', NULL, 'Основной акушерский порядок'
  FROM normative_documents WHERE code = 'NOV-MZ-718-D-2024'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'obgyn', 'novgorod-1424-d', NULL, 'Изменение акушерского порядка'
  FROM normative_documents WHERE code = 'NOV-MZ-1424-D-2025'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'obgyn', 'novgorod-1134-d', 'trauma', 'Травматологическая ветка акушерского профиля'
  FROM normative_documents WHERE code = 'NOV-MZ-1134-D-2023'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'obgyn', 'novgorod-409-d', 'surgery', 'Хирургическая ветка акушерского профиля'
  FROM normative_documents WHERE code = 'NOV-MZ-409-D-2023'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'oncology', 'novgorod-oncology-routing', NULL, 'Региональный онкологический порядок'
  FROM normative_documents WHERE code = 'NOV-MZ-1180-D-2025'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_references (
  document_id, profile_id, source_id, branch_id, reference_label
)
SELECT id, 'bsk', 'novgorod-400-d', NULL, 'Предоставленный приказ БСК; требуется сопоставление с № 1368-Д'
  FROM normative_documents WHERE code = 'NOV-MZ-400-D-2024'
ON CONFLICT DO NOTHING;

INSERT INTO normative_document_relations (
  parent_document_id, related_document_id, relation_type
)
SELECT base.id, amendment.id, 'amends'
  FROM normative_documents base
  JOIN normative_documents amendment ON amendment.code = 'NOV-MZ-1424-D-2025'
 WHERE base.code = 'NOV-MZ-718-D-2024'
ON CONFLICT DO NOTHING;
