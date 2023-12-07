import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import Routes component
import { LoginSignUp } from './Components/LoginSignUp/LoginSignUp';
import { Dashboard } from './Components/Dashboard/Dashboard';

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/dashboard/:user_id" element={<Dashboard />} />
          <Route path="/" element={<LoginSignUp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
