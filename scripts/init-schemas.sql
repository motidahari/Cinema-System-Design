-- Runs once on first container start (docker-entrypoint-initdb.d).
-- Creates only the schemas and the UUID extension.
-- Table and enum creation is owned by TypeORM (synchronize: true in local)
-- or migrations (sandbox/production). See DECISIONS.md ADR-5/ADR-6.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS cinema;
