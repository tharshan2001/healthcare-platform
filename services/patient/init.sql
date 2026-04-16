CREATE USER patient_user WITH PASSWORD 'patient_pass';
CREATE DATABASE patient_db;
GRANT ALL PRIVILEGES ON DATABASE patient_db TO patient_user;