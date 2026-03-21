INSERT INTO "User" (
  "id",
  "name",
  "phone",
  "password",
  "role",
  "profileCompleted",
  "telegramUsername",
  "preferredContactChannel",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'wanshitong',
  'wanshitong',
  '$2b$12$X26GgIL93/MQHIAexNlCi.4OwhdQKPgkQ/1z8SBcCTZ8c9.APCvSm',
  'ADMIN',
  false,
  NULL,
  'PHONE',
  NOW(),
  NOW()
)
ON CONFLICT ("phone")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "updatedAt" = NOW();
