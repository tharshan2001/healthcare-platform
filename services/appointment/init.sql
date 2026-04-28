CREATE USER appointment_user WITH PASSWORD 'appointment_pass';
CREATE DATABASE appointment_db;
GRANT ALL PRIVILEGES ON DATABASE appointment_db TO appointment_user;