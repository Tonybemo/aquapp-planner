-- Script para la Base de Datos Supabase - Aquapp Planner

-- 1. Tabla de Clientes (La fuente de la verdad para ambas aplicaciones)
-- Aquapp escribirá aquí sus clientes. Aquapp Planner leerá de aquí y podrá añadir nombres nuevos.
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Estado del Planificador
-- En lugar de crear complejas tablas relacionales formales para la agenda,
-- guardaremos el "estado" completo del calendario (calendarEntries y delegatedClients) 
-- en un solo documento JSON. 
-- ESTO ES CLAVE para que arrastrar tarjetas rápido en el móvil no genere errores de sincronización (Race Conditions)
-- y para que funcione perfecto el modo offline en el futuro.
CREATE TABLE IF NOT EXISTS planner_state (
  id INT PRIMARY KEY DEFAULT 1, -- Solo habrá una fila (la tuya)
  entries JSONB, -- Toda la configuración del calendario
  delegated JSONB, -- Todos los delegados
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserta la fila inicial por defecto si no existe
INSERT INTO planner_state (id, entries, delegated) VALUES (1, '{}'::jsonb, '[]'::jsonb) ON CONFLICT (id) DO NOTHING;

-- Reglas de seguridad (RSL)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a anon en clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Permitir todo a anon en planner_state" ON planner_state FOR ALL USING (true);
