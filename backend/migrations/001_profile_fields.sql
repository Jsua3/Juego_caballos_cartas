-- Fase 1: Agregar campos de perfil a la tabla users
-- Ejecutar una sola vez en HeidiSQL o Railway

ALTER TABLE users ADD COLUMN display_name VARCHAR(50) NULL AFTER username;
ALTER TABLE users ADD COLUMN avatar_url   VARCHAR(255) NULL AFTER display_name;
ALTER TABLE users ADD COLUMN bio          VARCHAR(200) NULL AFTER avatar_url;
