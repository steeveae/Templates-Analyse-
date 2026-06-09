-- ============================================================
-- Gabon Occaz – Script de création des tables Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extension UUID (activée par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- Table : listings
-- Stocke les annonces agrégées depuis les sources externes
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  price       INT         NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('Véhicule', 'Électronique')),
  city        TEXT        NOT NULL CHECK (city IN ('Libreville', 'Port-Gentil', 'Franceville')),
  image_url   TEXT,
  source_url  TEXT        NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour accélérer les filtres courants sur listings
CREATE INDEX IF NOT EXISTS idx_listings_category  ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_city      ON listings (city);
CREATE INDEX IF NOT EXISTS idx_listings_price     ON listings (price);

-- ----------------------------------------------------------
-- Table : alerts
-- Stocke les alertes Telegram configurées par les utilisateurs
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id               UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id TEXT  NOT NULL,
  keyword          TEXT  NOT NULL,
  max_price        INT,
  city             TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour retrouver rapidement les alertes actives
CREATE INDEX IF NOT EXISTS idx_alerts_city       ON alerts (city);
CREATE INDEX IF NOT EXISTS idx_alerts_max_price  ON alerts (max_price);
