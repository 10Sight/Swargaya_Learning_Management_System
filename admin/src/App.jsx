import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomeLayout from './Layout/HomeLayout';
import Home from './pages/Home';

const About = () => <h2 className="text-2xl text-blue-400">About Page</h2>;

const App = () => {
  return (
    <Router>
      <HomeLayout>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </HomeLayout>
    </Router>
  );
};

export default App;
