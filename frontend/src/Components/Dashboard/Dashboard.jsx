import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Dashboard.css';
import famIcon from '../Assets/familyImage.jpg';

export const Dashboard = () => {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newFloor, setNewFloor] = useState({
    floorName: '',
    rooms: 0,
  });
  const [allRooms, setAllRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [updatedCapacity, setUpdatedCapacity] = useState('');

  const [userBookings, setUserBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Fetch user bookings
  const fetchUserBookings = async () => {
    try {
      const bookingsResponse = await fetch(`http://localhost:5000/get_user_bookings/${user_id}`);
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setUserBookings(bookingsData);
      } else {
        console.error('Error fetching user bookings:', bookingsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
    }
  };

  // Fetch user information and all rooms
  const fetchData = async () => {
    try {
      // Fetch user information
      const userResponse = await fetch(`http://localhost:5000/user/${user_id}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);

        // Determine isAdmin status based on user data
        setIsAdmin(userData && userData.isadmin);
      }

      // Fetch all rooms
      const roomsResponse = await fetch('http://localhost:5000/get_rooms');
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        setAllRooms(roomsData);
      }

      // Fetch user bookings
      await fetchUserBookings();

      // Set loading to false once all data is fetched
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false); // Set loading to false in case of an error
    }
  };

  useEffect(() => {
    fetchData();
  }, [user_id]);

  
  const handleLogout = () => {
    navigate('/');
    console.log('Logout clicked');
  };

  const handleAddFloor = async () => {
    try {
      const response = await fetch(`http://localhost:5000/add_floor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFloor.floorName,
          rooms: newFloor.rooms,
        }),
      });

      if (response.ok) {
        toast.success('Floor added successfully!');
        console.log('Floor added successfully!');
        setNewFloor({
          floorName: '',
          rooms: 0,
        });

        // Fetch and update floors after adding the new floor
        // Make sure to replace 'floors' with the appropriate endpoint
        const floorsResponse = await fetch(`http://localhost:5000/get_floors`);
        if (floorsResponse.ok) {
          const floorsData = await floorsResponse.json();
          // Handle updating state with the new floor data
        }
        // Fetch all rooms
        const roomsResponse = await fetch('http://localhost:5000/get_rooms');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setAllRooms(roomsData);
        }
      } else {
        console.error('Error adding floor:', response.status);
      }
    } catch (error) {
      console.error('Error during add floor:', error);
    }
  };

  const handleRoomSelection = (room) => {
    setSelectedRoom(room);
    setUpdatedCapacity(room.capacity.toString());
  };

  const handleCapacityChange = (room_id, newCapacity) => {
    // Update the capacity in the component state when the input changes
    setAllRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.room_id === room_id ? { ...room, capacity: newCapacity } : room
      )
    );
  };

  const handleCapacityUpdate = async () => {
    try {
      const response = await fetch(`http://localhost:5000/update_rooms/${selectedRoom.room_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          floor_id: selectedRoom.floor_id,
          capacity: updatedCapacity,
          availability: selectedRoom.availability,
          updation_time: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Capacity updated successfully!');
        console.log('Capacity updated successfully!');

        // Clear the selected room and updated capacity after successful update
        setSelectedRoom(null);
        setUpdatedCapacity('');
      } else {
        console.error('Error updating capacity:', response.status);
      }
    } catch (error) {
      console.error('Error during capacity update:', error);
    }
  };

  const handleBookRoom = async (room) => {
    try {
      // Fetch floor_id based on floor_name
      const floorNameResponse = await fetch(`http://localhost:5000/get_floor_id/${room.floor_name}`);
      if (!floorNameResponse.ok) {
        console.error('Error fetching floor_id:', floorNameResponse.status);
        return;
      }
  
      const floorNameData = await floorNameResponse.json();
      const floor_id = floorNameData.floor_id;
  
      // Book the room with the obtained floor_id
      const response = await fetch(`http://localhost:5000/book_room/${room.room_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          floor_id: floor_id, // Use the obtained floor_id
        }),
      });
  
      if (response.ok) {
        console.log('Room booked successfully!');
  
        // Fetch the updated room data after booking
        const updatedRoomsResponse = await fetch('http://localhost:5000/get_rooms');
        if (updatedRoomsResponse.ok) {
          const updatedRoomsData = await updatedRoomsResponse.json();
          console.log('Updated room data:', updatedRoomsData);
  
          // Update the room availability in the state
          setAllRooms(updatedRoomsData);
  
          toast.success(`Room booked successfully!`);
        } else {
          console.error('Error fetching updated room data:', updatedRoomsResponse.status);
        }
      } else {
        console.error('Error booking room:', response.status);
      }
    } catch (error) {
      console.error('Error during room booking:', error);
    }
  };  
  
  return (
    <div className="dashboard-container">
      <div className="logout-button-container">
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
      <h1 className="dashboard-title">Welcome to the Dashboard</h1>
      {userInfo && <p className="greeting-message">Hello, {userInfo.name}!</p>}

      {/* Include isAdmin condition for rendering admin-specific content */}
      {userInfo && userInfo.isadmin && (
        <div>
          {/* Admin-specific content goes here */}
          <div className="form-container">
            <h2>Add Floor</h2>
            <div className="form-row">
              <label>Floor Name:</label>
              <input
                type="text"
                value={newFloor.floorName}
                onChange={(e) => setNewFloor({ ...newFloor, floorName: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Number of Rooms:</label>
              <input
                type="number"
                value={newFloor.rooms}
                onChange={(e) => setNewFloor({ ...newFloor, rooms: e.target.value })}
              />
            </div>
            <button onClick={handleAddFloor} className="action-button">Add Floor</button>
          </div>

          <h2>All Rooms</h2>
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Room ID</th>
                <th>Floor Name</th>
                <th>Capacity</th>
                <th>Availability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allRooms.map((room) => (
                <tr key={room.room_id}>
                  <td>{room.room_id}</td>
                  <td>{room.floor_name}</td>
                  <td>
                    <input
                      type="number"
                      value={room.capacity} // Display the current capacity as the default value
                      onChange={(e) => handleCapacityChange(room.room_id, e.target.value)}
                    />
                  </td>
                  <td>{room.availability ? "Available" : "Not Available"}</td>
                  <td>
                    <button onClick={() => handleRoomSelection(room)}>Update Capacity</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
              
          {selectedRoom && (
            <div className="capacity-update-container">
              <h3>Update Capacity for Room ID: {selectedRoom.room_id}</h3>
              <div className="form-row">
                <label>New Capacity:</label>
                <input
                  type="number"
                  value={updatedCapacity}
                  onChange={(e) => setUpdatedCapacity(e.target.value)}
                />
              </div>
              <button onClick={handleCapacityUpdate}>Update Capacity</button>
            </div>
          )}
        </div>
      )}

      {/* ... (rest of the component remains the same) */}
      {userInfo && !userInfo.isadmin && (
        <div>
          <h2>All Rooms</h2>
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Room ID</th>
                <th>Floor Name</th>
                <th>Capacity</th>
                <th>Availability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allRooms.map((room) => {
                const isBookedByCurrentUser = userBookings.some((booking) => booking.room_id === room.room_id);
              
                return (
                  <tr key={room.room_id}>
                    <td>{room.room_id}</td>
                    <td>{room.floor_name}</td>
                    <td>{room.capacity}</td>
                    <td>
                      {isBookedByCurrentUser ? 'Booked by you' : room.availability ? 'Available' : 'Not Available'}
                    </td>
                    <td>
                      {room.availability && !isBookedByCurrentUser && (
                        <button onClick={() => handleBookRoom(room)}>Book Room</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    
    <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />  
    </div>
  );
};
