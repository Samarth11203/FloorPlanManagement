const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret = "secret";

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// ROUTES

// Fetch User Information by user_id
app.get("/user/:user_id", async (req, res) => {
  try {
    const user_id = req.params.user_id;

    // Step 1: Check if the user with the provided user_id exists
    const user = await pool.query("SELECT * FROM users WHERE user_id = $1", [
      user_id,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// User Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Check if the user with the provided email exists
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json("Invalid Credentials");
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(401).json("Invalid Credentials");
    }

    // Step 2: Generate a JWT token for authentication
    const token = jwt.sign(
      { user_id: user.rows[0].user_id, email: user.rows[0].email },
      secret,
      { expiresIn: "1h" }
    );

    // Include user_id in the response
    res.json({ user_id: user.rows[0].user_id, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// User Signup
app.post("/signup", async (req, res) => {
    try {
      const { username, email, password, isAdmin } = req.body;
  
      // Step 1: Check if the user with the provided email already exists
      const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (existingUser.rows.length > 0) {
        return res.status(400).json("User already exists with this email");
      }
  
      // Step 2: Encrypt the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Step 3: Add the user with encrypted password to the database
      const newUser = await pool.query(
        "INSERT INTO users (name, email, password, isAdmin) VALUES($1, $2, $3, $4) RETURNING *",
        [username, email, hashedPassword, isAdmin]
      );
  
      res.json(newUser.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});

// Add a new floor and trigger room addition
app.post("/add_floor", async (req, res) => {
    try {
      const { name, rooms } = req.body;
  
      // Step 1: Add a new floor to the floor_plans table
      const newFloor = await pool.query(
        "INSERT INTO floor_plans (name, rooms) VALUES($1, $2) RETURNING *",
        [name, rooms]
      );
  
      res.json(newFloor.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});

// Get all floors
app.get("/get_floors", async (req, res) => {
    try {
      // Fetch all floors from the floor_plans table
      const allFloors = await pool.query("SELECT * FROM floor_plans");
  
      res.json(allFloors.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});  

// Get all rooms with floor name
app.get("/get_rooms", async (req, res) => {
    try {
      // Fetch all rooms from the meeting_rooms table with floor name
      const allRooms = await pool.query(
        "SELECT meeting_rooms.room_id, meeting_rooms.floor_id, meeting_rooms.capacity, meeting_rooms.availability, floor_plans.name as floor_name FROM meeting_rooms JOIN floor_plans ON meeting_rooms.floor_id = floor_plans.floor_id"
      );
  
      res.json(allRooms.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  });  

// Example trigger to automatically create entries in meeting_rooms when a new floor_plan is added
const createInitialRoomsTrigger = `
CREATE OR REPLACE FUNCTION create_initial_rooms()
RETURNS TRIGGER AS $$
DECLARE
    i INT := 0;
BEGIN
    -- Loop through each room and insert entries into meeting_rooms
    WHILE i < NEW.rooms LOOP
        INSERT INTO meeting_rooms (floor_id) VALUES (NEW.floor_id);
        i := i + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_create_floor_plan
AFTER INSERT ON floor_plans
FOR EACH ROW
EXECUTE FUNCTION create_initial_rooms();
`;

// Apply the trigger
pool.query(createInitialRoomsTrigger, (err, res) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Trigger created successfully");
  }
});

// Update rooms with conflict resolution
app.put("/update_rooms/:room_id", async (req, res) => {
    try {
      const room_id = req.params.room_id;
      const { user_id, floor_id, capacity, availability, updation_time } = req.body;
  
      // Step 1: Check if the room with the provided room_id exists
      const existingRoom = await pool.query("SELECT * FROM meeting_rooms WHERE room_id = $1", [
        room_id,
      ]);
  
      if (existingRoom.rows.length === 0) {
        return res.status(404).json("Meeting room not found");
      }
  
      // Step 2: Check if an entry for the room exists in the floor_versions table
      const latestVersionTime = await pool.query(
        "SELECT MAX(updation_time) FROM floor_versions WHERE room_id = $1",
        [room_id]
      );
  
      const latestUpdationTime = latestVersionTime.rows[0].max || "1999-12-07 06:24:42.400735+05:30";
  
      // Step 3: Check if the provided updation_time is greater than the latest updation_time
      if (new Date(updation_time) > new Date(latestUpdationTime)) {
        // Update meeting_rooms and floor_versions tables
        const updatedRoom = await pool.query(
          "UPDATE meeting_rooms SET capacity = $1, availability = $2, floor_id = $4 WHERE room_id = $3 RETURNING *",
          [capacity, availability, room_id, floor_id]
        );
  
        const newVersion = await pool.query(
          "INSERT INTO floor_versions (user_id, floor_id, room_id, capacity, availability, updation_time) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
          [user_id, floor_id, room_id, capacity, availability, updation_time]
        );
  
        res.json({ updatedRoom: updatedRoom.rows[0], newVersion: newVersion.rows[0] });
      } else {
        const newVersion = await pool.query(
          "INSERT INTO floor_versions (user_id, floor_id, room_id, capacity, availability, updation_time) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
          [user_id, floor_id, room_id, capacity, availability, updation_time]
        );
        return res.status(409).json(`Conflict: Room information has been updated by another user at ${latestUpdationTime}`);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});

// Book a room
app.post("/book_room/:room_id", async (req, res) => {
    try {
      const room_id = req.params.room_id;
      const { user_id, floor_id } = req.body;
  
      // Step 1: Check if the room with the provided room_id exists
      const existingRoom = await pool.query("SELECT * FROM meeting_rooms WHERE room_id = $1", [
        room_id,
      ]);
  
      if (existingRoom.rows.length === 0) {
        return res.status(404).json("Meeting room not found");
      }
  
      // Step 2: Check room availability
      if (!existingRoom.rows[0].availability) {
        return res.status(409).json("Room is not available for booking");
      }
  
      // Step 3: Book the room
      const bookingResult = await pool.query(
        "INSERT INTO room_bookings (user_id, floor_id, room_id) VALUES ($1, $2, $3) RETURNING *",
        [user_id, floor_id, room_id]
      );
  
      // Step 4: Update meeting_rooms availability and last_booked_at
      const updateRoomResult = await pool.query(
        "UPDATE meeting_rooms SET availability = false, last_booked_at = $1 WHERE room_id = $2 RETURNING *",
        [bookingResult.rows[0].booked_at, room_id]
      );
  
      res.json({
        booking: bookingResult.rows[0],
        updatedRoom: updateRoomResult.rows[0],
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});  

// Get floor_id by floor_name
app.get('/get_floor_id/:floor_name', async (req, res) => {
    try {
      const floor_name = req.params.floor_name;
      const result = await pool.query('SELECT floor_id FROM floor_plans WHERE name = $1', [floor_name]);
  
      if (result.rows.length > 0) {
        res.json({ floor_id: result.rows[0].floor_id });
      } else {
        res.status(404).json({ error: 'Floor not found' });
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
});  

// Fetch bookings for a specific user
app.get("/get_user_bookings/:user_id", async (req, res) => {
    try {
      const user_id = req.params.user_id;
  
      // Retrieve bookings for the specified user from the room_bookings table
      const userBookings = await pool.query(
        "SELECT * FROM room_bookings WHERE user_id = $1",
        [user_id]
      );
  
      res.json(userBookings.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
});  

app.listen(5000, () => {
  console.log("server has started on port 5000");
});
