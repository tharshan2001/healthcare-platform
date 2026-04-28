CREATE USER doctor_user WITH PASSWORD 'doctor_pass';
CREATE DATABASE doctor_db;
GRANT ALL PRIVILEGES ON DATABASE doctor_db TO doctor_user;