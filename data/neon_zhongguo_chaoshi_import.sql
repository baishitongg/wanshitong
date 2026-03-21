-- Neon import for ????
-- Run this in the Neon SQL editor after the ???? shop row exists.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Shop" WHERE slug = 'zhongguo-chaoshi') THEN
    RAISE EXCEPTION 'Shop with slug zhongguo-chaoshi does not exist. Seed/create the shop first.';
  END IF;
END $$;

-- Categories
INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_baby_misc', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Baby Misc', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_double_door_fridge', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Double Door Fridge', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_phone', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Phone', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_party', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Party', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_other', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Other', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_sandal', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Sandal', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_shoes', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Shoes', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_baby_clothing', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Baby Clothing', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_tyres', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Tyres', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Category" ("id", "shopId", "name", "createdAt", "updatedAt")
VALUES ('c_dj_audio', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'Dj Audio', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

-- Products
INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('000b127a-5afa-4801-aba9-55b87976c720', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_baby_misc', 'Mee Mee Advanced Digital Electric Breast Pump with', 'Mee Mee Advanced Digital Electric Breast Pump with 3 Modes - Massage, Suction & Let-Down |For Nursing & Breastfeeding (White)', 2999.00, 49, 'https://m.media-amazon.com/images/I/61DyJK4laQL._AC_UL320_.jpg', TRUE, '{"Type":["Baby Product"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('006ea950-fdac-4279-a348-3902159aa4af', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_double_door_fridge', 'Rockwell SFR550DDU Double Door Convertible Deep Freezer- 563', 'Rockwell SFR550DDU Double Door Convertible Deep Freezer- 563 Ltr (4 yrs Compressor Warranty, Low power Consumption)', 33790.00, 50, 'https://m.media-amazon.com/images/I/41vDjUl9z5L._AC_UL320_.jpg', TRUE, '{"Type":["Double Door"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('00ab1bee-7c47-4a52-a175-208f3759e7fe', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_phone', 'realme narzo 50 5G', 'realme narzo 50 5G', 2272.97, 48, 'https://m.media-amazon.com/images/I/91p5L+GitZL._AC_UL320_.jpg', TRUE, '{"Storage":["64GB","128GB","256GB","512GB"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('00c3e47a-6147-4640-add6-c3073e973b0a', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_party', 'Party Propz Birthday photobooth Props 23 pcs -', 'Party Propz Birthday photobooth Props 23 pcs - Multicolor', 399.00, 50, 'https://m.media-amazon.com/images/I/81SHFADT0DL._AC_UL320_.jpg', TRUE, '{"Type":["Party Decoration"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('012264d3-48dd-423c-8c43-1c90c5db7790', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_other', 'AmazonBasics Slam Ball, Square Grip, 4.5 kg', 'AmazonBasics Slam Ball, Square Grip, 4.5 kg', 2000.00, 50, 'https://m.media-amazon.com/images/I/716zvS4puCL._AC_UL320_.jpg', TRUE, '{"EquipmentType":["Other"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('0191ebef-e9f2-4c41-8749-1db5d5bc5451', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_sandal', 'Estd. 1977 Men Beige & Green Sandals', 'Estd. 1977 Men Beige & Green Sandals. Stylish and comfortable sandals for any occasion.', 458.99, 48, 'http://assets.myntassets.com/v1/images/style/properties/7adfef9d7001cdcb9a58822c0c8b615f_images.jpg', TRUE, '{"Option":["Default1","Default2"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('01a82cc7-ca63-45da-82ed-f6cbcfdede48', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_baby_misc', 'Kidology Wooden Rectangular Magnetic Fishing Toys for Kids', 'Kidology Wooden Rectangular Magnetic Fishing Toys for Kids | Games Letters ABC Numbers Alphabet Puzzle | Toddler Learning ...', 2999.00, 50, 'https://m.media-amazon.com/images/I/712DzVDLY6L._AC_UL320_.jpg', TRUE, '{"Type":["Baby Product"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('01b40753-ba5c-4aa3-9daa-7cdca4be5208', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_shoes', 'Nike Men Air Relentless Black Sports Shoes', 'Nike Men Air Relentless Black Sports Shoes. Trendy shoes designed for both comfort and fashion.', 84.49, 14, 'http://assets.myntassets.com/v1/images/style/properties/25dbd0bcceab68a7ab398c8a582094f6_images.jpg', TRUE, '{"Size":["36","37","38","39","40","41","42","43"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('01de0986-ab3b-48ed-a665-229357945cc4', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_baby_clothing', 'Wowper Fresh Baby Diaper Pants Medium Size Diapers', 'Wowper Fresh Baby Diaper Pants | Medium Size Diapers | Diapers with Wetness Indicator | Upto 10 Hrs Absorption | 7-12 Kg |...', 798.00, 50, 'https://m.media-amazon.com/images/I/81lt0nR6k1L._AC_UL320_.jpg', TRUE, '{"Type":["Baby Clothing"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('024e43d1-bb16-4d92-a6e3-6243fa347032', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_tyres', 'Ceat Milaze 350-10 51J Tube-Type Scooter', 'Ceat Milaze 3.50-10 51J Tube-Type Scooter Tyre,Front or Rear', 1759.00, 50, 'https://m.media-amazon.com/images/I/616yvupE77L._AC_UL320_.jpg', TRUE, '{"PartType":["Tyre"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('e0deb2ed-b570-422b-bffd-522b1161be52', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_dj_audio', 'Rode Dj_audio', 'Rode Dj_audio', 10500.00, 50, 'https://m.media-amazon.com/images/I/61gyMTJC-sL._AC_UL320_.jpg', TRUE, '{"Power":["10W","20W","50W","100W"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

INSERT INTO "Product" ("id", "shopId", "categoryId", "name", "description", "price", "stock", "imageUrl", "status", "attributes", "createdAt", "updatedAt")
VALUES ('e14e8142-4320-4174-ac9c-4daabf280adc', (SELECT "id" FROM "Shop" WHERE "slug" = 'zhongguo-chaoshi' LIMIT 1), 'c_dj_audio', 'Mackie Dj_audio', 'Mackie Dj_audio', 19000.00, 50, 'https://m.media-amazon.com/images/I/61htn+z2RBL._AC_UL320_.jpg', TRUE, '{"Power":["10W","20W","50W","100W"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "stock" = EXCLUDED."stock",
  "imageUrl" = EXCLUDED."imageUrl",
  "status" = EXCLUDED."status",
  "attributes" = EXCLUDED."attributes",
  "updatedAt" = NOW();

COMMIT;
