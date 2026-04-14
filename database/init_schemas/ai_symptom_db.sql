-- AI Symptom Service Database Schema
-- Healthcare Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for session status
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled', 'expired');

-- Enum for triage priority (1 = most urgent, 5 = least urgent)
CREATE TYPE triage_priority AS ENUM ('1', '2', '3', '4', '5');

-- Enum for alert type
CREATE TYPE alert_type AS ENUM ('critical', 'urgent', 'warning');

-- Symptom Sessions Table
-- Tracks individual symptom checking sessions
CREATE TABLE symptom_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    status session_status DEFAULT 'active',
    triage_priority triage_priority,
    chief_complaint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster patient history lookups
CREATE INDEX idx_symptom_sessions_patient_id ON symptom_sessions(patient_id);
CREATE INDEX idx_symptom_sessions_created_at ON symptom_sessions(created_at DESC);
CREATE INDEX idx_symptom_sessions_status ON symptom_sessions(status);

-- Symptom Entries Table
-- Individual symptoms reported within a session
CREATE TABLE symptom_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES symptom_sessions(id) ON DELETE CASCADE,
    symptom_name VARCHAR(255) NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    duration VARCHAR(100),
    duration_value INTEGER,
    duration_unit VARCHAR(20),
    body_location VARCHAR(255),
    description TEXT,
    onset_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session-based symptom lookups
CREATE INDEX idx_symptom_entries_session_id ON symptom_entries(session_id);

-- Analysis Results Table
-- Stores AI-generated analysis for each session
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES symptom_sessions(id) ON DELETE CASCADE,
    possible_conditions JSONB NOT NULL DEFAULT '[]',
    recommended_specialty VARCHAR(100),
    severity_score INTEGER CHECK (severity_score >= 1 AND severity_score <= 10),
    is_emergency BOOLEAN DEFAULT FALSE,
    follow_up_questions JSONB DEFAULT '[]',
    ai_reasoning TEXT,
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_used VARCHAR(100),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session-based analysis lookups
CREATE INDEX idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX idx_analysis_results_is_emergency ON analysis_results(is_emergency);

-- Emergency Alerts Table
-- Logs emergency detections for audit and follow-up
CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES symptom_sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    alert_type alert_type NOT NULL,
    triggered_symptoms JSONB NOT NULL,
    emergency_instructions TEXT,
    was_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for emergency alert lookups
CREATE INDEX idx_emergency_alerts_session_id ON emergency_alerts(session_id);
CREATE INDEX idx_emergency_alerts_patient_id ON emergency_alerts(patient_id);
CREATE INDEX idx_emergency_alerts_created_at ON emergency_alerts(created_at DESC);
CREATE INDEX idx_emergency_alerts_alert_type ON emergency_alerts(alert_type);

-- Follow-up Responses Table
-- Stores patient responses to AI follow-up questions
CREATE TABLE follow_up_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES symptom_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for follow-up response lookups
CREATE INDEX idx_follow_up_responses_session_id ON follow_up_responses(session_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_symptom_sessions_updated_at
    BEFORE UPDATE ON symptom_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at
    BEFORE UPDATE ON analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some common medical specialties reference (optional, for validation)
CREATE TABLE medical_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO medical_specialties (name, description) VALUES
    ('General Practice', 'Primary care for general health concerns'),
    ('Cardiology', 'Heart and cardiovascular system'),
    ('Neurology', 'Brain, spine, and nervous system'),
    ('Dermatology', 'Skin, hair, and nail conditions'),
    ('Gastroenterology', 'Digestive system and stomach'),
    ('Orthopedics', 'Bones, joints, and muscles'),
    ('Pulmonology', 'Lungs and respiratory system'),
    ('Psychiatry', 'Mental health and behavioral disorders'),
    ('Endocrinology', 'Hormones and metabolic disorders'),
    ('Ophthalmology', 'Eyes and vision'),
    ('ENT', 'Ear, nose, and throat'),
    ('Urology', 'Urinary system and male reproductive health'),
    ('Gynecology', 'Female reproductive system'),
    ('Rheumatology', 'Autoimmune and joint diseases'),
    ('Oncology', 'Cancer diagnosis and treatment'),
    ('Emergency Medicine', 'Urgent and emergency care'),
    ('Infectious Disease', 'Infections and communicable diseases'),
    ('Allergy & Immunology', 'Allergies and immune system disorders');
