CREATE DATABASE floor_management;

-- Create the users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    isAdmin BOOLEAN DEFAULT FALSE
);

-- Create the floor_plans table
CREATE TABLE floor_plans (
    floor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rooms INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create the meeting_rooms table
CREATE TABLE meeting_rooms (
    room_id SERIAL PRIMARY KEY,
    floor_id INTEGER REFERENCES floor_plans(floor_id) ON DELETE CASCADE,
    capacity INTEGER NOT NULL DEFAULT 20,
    availability BOOLEAN NOT NULL DEFAULT true,
    last_booked_at TIMESTAMPTZ
);

-- Create the floor_versions table
CREATE TABLE floor_versions (
    version_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    floor_id INTEGER REFERENCES floor_plans(floor_id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES meeting_rooms(room_id) ON DELETE CASCADE,
    capacity INTEGER,
    availability BOOLEAN,
    updation_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create room_bookings table
CREATE TABLE room_bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    floor_id INTEGER REFERENCES floor_plans(floor_id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES meeting_rooms(room_id) ON DELETE CASCADE,
    booked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);