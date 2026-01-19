#!/bin/bash
set -e

# Create the main database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE shama_platform;
    GRANT ALL PRIVILEGES ON DATABASE shama_platform TO $POSTGRES_USER;
EOSQL

# Connect to the new database and create schemas
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "shama_platform" <<-EOSQL
    -- Create schemas for each service
    CREATE SCHEMA IF NOT EXISTS inventory AUTHORIZATION $POSTGRES_USER;
    CREATE SCHEMA IF NOT EXISTS crm AUTHORIZATION $POSTGRES_USER;
    CREATE SCHEMA IF NOT EXISTS sales AUTHORIZATION $POSTGRES_USER;

    -- Grant permissions
    GRANT ALL ON SCHEMA inventory TO $POSTGRES_USER;
    GRANT ALL ON SCHEMA crm TO $POSTGRES_USER;
    GRANT ALL ON SCHEMA sales TO $POSTGRES_USER;
EOSQL