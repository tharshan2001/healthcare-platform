CREATE USER notification_user WITH PASSWORD 'notification_pass';
CREATE DATABASE notification_db;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_user;