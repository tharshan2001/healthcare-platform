CREATE USER telemedicine_user WITH PASSWORD 'telemedicine_pass';
CREATE DATABASE telemedicine_db;
GRANT ALL PRIVILEGES ON DATABASE telemedicine_db TO telemedicine_user;