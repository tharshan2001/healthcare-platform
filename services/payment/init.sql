CREATE USER payment_user WITH PASSWORD 'payment_pass';
CREATE DATABASE payment_db;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;